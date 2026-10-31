import { NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  getMilestones,
  updateMilestone,
  recordTelemetryEvent,
  getTelemetryForMilestone,
  getAllTelemetryEvents,
} from '@/lib/store';
import { PayPalWebhookEventType, PayPalTelemetryEvent } from '@/types/escrow';

/**
 * GET /api/paypal/webhook
 * Retrieves PayPal webhook telemetry events (optionally filtered by ?milestoneId=xxx).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const milestoneId = searchParams.get('milestoneId');

  if (milestoneId) {
    const events = getTelemetryForMilestone(milestoneId);
    return NextResponse.json({ events }, { status: 200 });
  }

  const events = getAllTelemetryEvents();
  return NextResponse.json({ events }, { status: 200 });
}

/**
 * POST /api/paypal/webhook
 *
 * Authoritative ingestion endpoint for PayPal Sandbox Webhooks:
 * - PAYMENT.PAYOUTSBATCH.SUBMITTED
 * - PAYMENT.PAYOUTSBATCH.PROCESSING
 * - PAYMENT.PAYOUTSBATCH.SUCCESS
 * - PAYMENT.PAYOUTS-ITEM.SUCCEEDED
 * - PAYMENT.PAYOUTS-ITEM.FAILED
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const eventType = body.event_type as PayPalWebhookEventType;
    const summary = body.summary || `PayPal Webhook: ${eventType}`;
    const resource = body.resource || {};

    // Extract identifiers from webhook resource payload
    const payoutBatchId =
      resource.payout_batch_id ||
      resource.batch_header?.payout_batch_id ||
      body.resource?.batch_header?.payout_batch_id;

    const senderBatchId =
      resource.batch_header?.sender_batch_header?.sender_batch_id ||
      resource.sender_batch_id;

    const senderItemId = resource.payout_item?.sender_item_id || resource.sender_item_id;

    // Match event to a milestone in our ledger
    const milestones = getMilestones();
    const matchedMilestone = milestones.find((m) => {
      if (senderItemId && m.id === senderItemId) return true;
      if (payoutBatchId && m.payout?.paypalPayoutBatchId === payoutBatchId) return true;
      if (senderBatchId && m.payout?.senderBatchId === senderBatchId) return true;
      return false;
    });

    const milestoneId = matchedMilestone?.id || senderItemId || 'general';

    const telemetryEvent: PayPalTelemetryEvent = {
      id: body.id || `wh-${crypto.randomUUID()}`,
      milestoneId,
      eventType: eventType || 'PAYMENT.PAYOUTSBATCH.PROCESSING',
      timestamp: body.create_time || new Date().toISOString(),
      summary,
      rawPayload: body,
    };

    recordTelemetryEvent(telemetryEvent);

    // If item succeeded, mark milestone payout as settled
    if (
      matchedMilestone &&
      (eventType === 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED' || eventType === 'PAYMENT.PAYOUTSBATCH.SUCCESS')
    ) {
      updateMilestone(matchedMilestone.id, {
        payoutStatus: 'SUCCESS',
        payout: matchedMilestone.payout
          ? {
              ...matchedMilestone.payout,
              status: 'SUCCESS',
              paypalTransactionId:
                resource.transaction_id ||
                resource.payout_item?.transaction_id ||
                `txn-sbx-${crypto.randomBytes(6).toString('hex')}`,
              completedAt: new Date().toISOString(),
            }
          : undefined,
      });
    }

    // If item failed, mark milestone as failed with error details
    if (matchedMilestone && eventType === 'PAYMENT.PAYOUTS-ITEM.FAILED') {
      updateMilestone(matchedMilestone.id, {
        payoutStatus: 'FAILED',
        payout: matchedMilestone.payout
          ? {
              ...matchedMilestone.payout,
              status: 'FAILED',
              errorMessage: resource.errors?.message || 'PayPal Payout Item disbursement failed',
            }
          : undefined,
      });
    }

    return NextResponse.json({ received: true, eventId: telemetryEvent.id }, { status: 200 });
  } catch (error: any) {
    console.error('Error handling PayPal webhook:', error);
    return NextResponse.json(
      { error: error?.message || 'Error processing webhook event' },
      { status: 500 }
    );
  }
}
