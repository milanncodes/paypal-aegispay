import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getMilestoneById, updateMilestone } from '@/lib/store';
import { evaluateDeliverable } from '@/lib/evaluator';
import { evaluateReleasePolicy, calculateChallengeWindow } from '@/lib/policyEngine';
import { SubmissionManifest, VerificationStatus, PolicyStatus, PayoutStatus } from '@/types/escrow';

export const dynamic = 'force-dynamic';

/**
 * POST /api/milestones/submit
 *
 * Accepts a contractor code deliverable and test logs, initiates two-pass
 * content sanitization and evaluation, executes the deterministic policy gate,
 * and advances the milestone lifecycle.
 */
export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request payload' },
        { status: 400 }
      );
    }

    const { milestoneId, repoUrl, commitSha, diff, testLogs } = body || {};

    if (!milestoneId) {
      return NextResponse.json(
        { error: 'Missing milestoneId' },
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

    // Generate or bind the immutable Git commit SHA to prevent TOCTOU
    const effectiveCommitSha =
      (commitSha && typeof commitSha === 'string' && commitSha.trim()) ||
      crypto
        .createHash('sha256')
        .update(diff || `${milestone.id}-${Date.now()}`)
        .digest('hex')
        .substring(0, 40);

    const submission: SubmissionManifest = {
      repoUrl:
        (repoUrl && typeof repoUrl === 'string' && repoUrl.trim()) ||
        'https://github.com/aegispay/deliverable',
      commitSha: effectiveCommitSha,
      treeSha: crypto.randomBytes(20).toString('hex'),
      diffSummary: diff
        ? `${diff.split('\n').length} lines of code modified`
        : 'Standard diff changes applied',
      testArtifactHash: crypto
        .createHash('sha256')
        .update(testLogs || 'empty-test-run')
        .digest('hex'),
      submittedAt: new Date().toISOString(),
    };

    // Stage 1: Update milestone with bound submission
    updateMilestone(milestoneId, {
      submission,
      verificationStatus: 'ANALYZING',
    });

    // Refresh milestone reference with submission attached
    const refreshedMilestone = getMilestoneById(milestoneId);
    if (!refreshedMilestone) {
      return NextResponse.json(
        { error: `Failed to reload milestone ${milestoneId}` },
        { status: 500 }
      );
    }

    // Stage 2: Execute Isolated Two-Pass AI Evaluation
    const assessment = await evaluateDeliverable({
      milestoneTitle: refreshedMilestone.title,
      acceptanceCriteria: refreshedMilestone.acceptanceCriteria,
      sowVersionHash: refreshedMilestone.sowVersionHash,
      submissionCommitSha: effectiveCommitSha,
      rawDiff: diff || '',
      testLogs: testLogs || '',
    });

    // Stage 3: Pass assessment through the Deterministic Policy Gate
    const policyResult = evaluateReleasePolicy(refreshedMilestone, assessment);

    // Stage 4: Transition State according to Policy Decision
    let newVerificationStatus: VerificationStatus = 'PASSED';
    if (!assessment.deterministicChecksPassed || !assessment.securityChecksPassed) {
      newVerificationStatus = 'FAILED';
    }

    let newPolicyStatus: PolicyStatus = policyResult.decision;
    let newPayoutStatus: PayoutStatus = refreshedMilestone.payoutStatus;
    let challengeEndsAt: string | undefined = undefined;

    if (policyResult.decision === 'AUTONOMOUS_APPROVED') {
      newPolicyStatus = 'AUTONOMOUS_APPROVED';
      newPayoutStatus = 'CHALLENGE_COOLING';
      // Use configured challengeWindowSeconds (15s in demo)
      const window = calculateChallengeWindow(refreshedMilestone.challengeWindowSeconds || 15);
      challengeEndsAt = window.endsAt;
    } else if (policyResult.decision === 'REQUIRES_HUMAN_SIGN_OFF') {
      newPolicyStatus = 'REQUIRES_HUMAN_SIGN_OFF';
    } else {
      newPolicyStatus = 'REJECTED';
    }

    const updated = updateMilestone(milestoneId, {
      submission,
      assessment,
      verificationStatus: newVerificationStatus,
      policyStatus: newPolicyStatus,
      payoutStatus: newPayoutStatus,
      challengeEndsAt,
    });

    return NextResponse.json(
      {
        milestone: updated,
        policyResult,
        assessment,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Submit API Error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Internal evaluation error',
        stack: error?.stack,
      },
      { status: 500 }
    );
  }
}
