import { NextResponse } from 'next/server';
import { getMilestoneById, updateMilestone } from '@/lib/store';

/**
 * POST /api/milestones/halt
 *
 * Emergency dispute lock: Instantly halts any pending payout or active cooling window,
 * locking the milestone funds until formal resolution.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { milestoneId, reason } = body;

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

    const disputeReason = reason || 'Dispute triggered by counterparty during challenge window.';

    const updated = updateMilestone(milestoneId, {
      payoutStatus: 'HALTED',
      challengeEndsAt: undefined,
      payout: milestone.payout
        ? {
            ...milestone.payout,
            status: 'HALTED',
            errorMessage: disputeReason,
          }
        : undefined,
    });

    console.warn(`[AegisPay Dispute] Milestone ${milestoneId} HALTED. Reason: ${disputeReason}`);

    return NextResponse.json(
      {
        message: 'Milestone escrow successfully halted and frozen.',
        milestone: updated,
        reason: disputeReason,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error halting milestone:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error halting milestone' },
      { status: 500 }
    );
  }
}
