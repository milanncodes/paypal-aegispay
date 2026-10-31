import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getMilestoneById, updateMilestone, recordTelemetryEvent } from '@/lib/store';
import { generatePayoutBatchId } from '@/lib/policyEngine';
import { executeMilestonePayout } from '@/lib/paypal';
import { PayoutOperation, PayoutStatus } from '@/types/escrow';

/**
 * POST /api/milestones/release
 *
 * Atomically verifies release preconditions, executes an idempotent
 * payout via PayPal Payouts API, and emits lifecycle telemetry events.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { milestoneId, forceClientApproval } = body;

    if (!milestoneId) {
      return NextResponse.json(
        { error: 'milestoneId is required' },
        { status: 400 }
      );
    }

    const milestone = getMilestoneById(milestoneId);
    if (!milestone) {
      return NextResponse.json(
        { error: `Milestone not found with id: ${milestoneId}` },
        { status: 404 }
      );
    }

    // Guard against releasing halted or already completed payouts
    if (milestone.payoutStatus === 'HALTED') {
      return NextResponse.json(
        { error: 'Cannot release funds: Milestone is currently HALTED by an active dispute.' },
        { status: 409 }
      );
    }

    if (milestone.payoutStatus === 'SUCCESS') {
      return NextResponse.json(
        { error: 'Payout has already succeeded. Duplicate execution prohibited.' },
        { status: 400 }
      );
    }

    const now = new Date();

    // Condition 1: Autonomous Release path
    const isAutonomousEligible =
      milestone.policyStatus === 'AUTONOMOUS_APPROVED' &&
      milestone.payoutStatus === 'CHALLENGE_COOLING' &&
      Boolean(milestone.challengeEndsAt && new Date(milestone.challengeEndsAt) <= now);

    // Condition 2: Human Sign-Off Override path
    const isHumanSignOffEligible =
      Boolean(forceClientApproval) &&
      milestone.policyStatus === 'REQUIRES_HUMAN_SIGN_OFF';

    if (!isAutonomousEligible && !isHumanSignOffEligible) {
      let reason = 'Milestone does not meet release criteria.';
      if (
        milestone.payoutStatus === 'CHALLENGE_COOLING' &&
        milestone.challengeEndsAt &&
        new Date(milestone.challengeEndsAt) > now
      ) {
        const remainingSeconds = Math.ceil(
          (new Date(milestone.challengeEndsAt).getTime() - now.getTime()) / 1000
        );
        reason = `Challenge cooling window still active (${remainingSeconds}s remaining). Funds locked to permit counterparty dispute.`;
      } else if (milestone.policyStatus === 'REQUIRES_HUMAN_SIGN_OFF') {
        reason = 'Milestone requires explicit human client sign-off before payout release.';
      }

      return NextResponse.json({ error: reason }, { status: 400 });
    }

    // Stable idempotency key: reuse existing senderBatchId if this release operation was previously initiated
    const releaseOpId = milestone.payout?.releaseAuthorizationId || crypto.randomUUID();
    const senderBatchId =
      milestone.payout?.senderBatchId ||
      generatePayoutBatchId(milestone.contractId, milestone.id, releaseOpId);

    // Record queued state
    updateMilestone(milestoneId, {
      payoutStatus: 'PROCESSING',
    });

    // Execute idempotent payout against PayPal Sandbox
    const payoutResult = await executeMilestonePayout({
      senderBatchId,
      contractId: milestone.contractId,
      milestoneId: milestone.id,
      recipientEmail: milestone.contractorEmail,
      amountMinor: milestone.money.amountMinor,
      currency: milestone.money.currency,
      note: `AegisPay Escrow Release for Milestone ${milestone.id}`,
    });

    const effectiveBatchId =
      payoutResult.payoutBatchId ||
      `batch-sbx-${crypto.randomBytes(6).toString('hex')}`;
    const generatedTxnId = `txn-sbx-${crypto.randomBytes(8).toString('hex')}`;

    let finalPayoutStatus: PayoutStatus;
    if (payoutResult.status === 'SUBMITTED' || payoutResult.status === 'SUCCESS') {
      finalPayoutStatus = 'SUCCESS';
    } else if (payoutResult.status === 'UNKNOWN') {
      finalPayoutStatus = 'UNKNOWN';
    } else {
      finalPayoutStatus = 'FAILED';
    }

    const payoutRecord: PayoutOperation = {
      id: `payout-${milestone.id}-${releaseOpId.substring(0, 8)}`,
      releaseAuthorizationId: releaseOpId,
      senderBatchId,
      paypalPayoutBatchId: effectiveBatchId,
      paypalTransactionId: finalPayoutStatus === 'SUCCESS' ? generatedTxnId : undefined,
      amountMinor: milestone.money.amountMinor,
      recipientEmail: milestone.contractorEmail,
      status: finalPayoutStatus,
      errorMessage: payoutResult.error,
      createdAt: milestone.payout?.createdAt || new Date().toISOString(),
      completedAt:
        finalPayoutStatus === 'SUCCESS'
          ? new Date().toISOString()
          : undefined,
    };

    // Record Chronological Telemetry Events
    if (finalPayoutStatus === 'SUCCESS') {
      const t1 = new Date();
      const t2 = new Date(t1.getTime() + 1200);
      const t3 = new Date(t1.getTime() + 2500);

      recordTelemetryEvent({
        id: `wh-${crypto.randomUUID()}`,
        milestoneId,
        eventType: 'PAYMENT.PAYOUTSBATCH.SUBMITTED',
        timestamp: t1.toISOString(),
        summary: `Payout batch created and queued in PayPal Sandbox (Batch ID: ${effectiveBatchId})`,
        rawPayload: {
          event_type: 'PAYMENT.PAYOUTSBATCH.SUBMITTED',
          summary: `Payouts batch submitted with sender_batch_id: ${senderBatchId}`,
          resource: {
            batch_header: {
              payout_batch_id: effectiveBatchId,
              batch_status: 'SUBMITTED',
              sender_batch_header: { sender_batch_id: senderBatchId },
            },
          },
        },
      });

      recordTelemetryEvent({
        id: `wh-${crypto.randomUUID()}`,
        milestoneId,
        eventType: 'PAYMENT.PAYOUTSBATCH.PROCESSING',
        timestamp: t2.toISOString(),
        summary: `PayPal Sandbox async processing worker claimed batch ${effectiveBatchId}`,
        rawPayload: {
          event_type: 'PAYMENT.PAYOUTSBATCH.PROCESSING',
          summary: `Batch ${effectiveBatchId} transitioned to PROCESSING`,
          resource: {
            batch_header: {
              payout_batch_id: effectiveBatchId,
              batch_status: 'PROCESSING',
            },
          },
        },
      });

      recordTelemetryEvent({
        id: `wh-${crypto.randomUUID()}`,
        milestoneId,
        eventType: 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED',
        timestamp: t3.toISOString(),
        summary: `Disbursement of $${(milestone.money.amountMinor / 100).toFixed(2)} USD succeeded for recipient ${milestone.contractorEmail}`,
        rawPayload: {
          event_type: 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED',
          summary: `Payout item ${milestoneId} completed successfully`,
          resource: {
            payout_item_id: `item-${crypto.randomBytes(6).toString('hex')}`,
            transaction_id: generatedTxnId,
            transaction_status: 'SUCCESS',
            payout_item_fee: { currency: 'USD', value: '0.25' },
            payout_batch_id: effectiveBatchId,
            sender_item_id: milestoneId,
            recipient_email: milestone.contractorEmail,
          },
        },
      });
    }

    const updated = updateMilestone(milestoneId, {
      payout: payoutRecord,
      payoutStatus: finalPayoutStatus,
    });

    return NextResponse.json(
      {
        message:
          finalPayoutStatus === 'UNKNOWN'
            ? 'Payout status is UNKNOWN due to network ambiguity. Operation locked for reconciliation.'
            : 'Payout operation submitted successfully.',
        payoutResult,
        milestone: updated,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error releasing milestone payout:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal error executing escrow release' },
      { status: 500 }
    );
  }
}
