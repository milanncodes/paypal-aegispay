/**
 * Deterministic Policy Engine & Idempotency Key Generator
 *
 * Strict verification firewall between advisory AI evaluations and PayPal financial execution.
 * Guarantees:
 * 1. The AI is purely advisory: Cannot authorize release without hard deterministic checks passing.
 * 2. Deterministic Idempotency: SHA-256 senderBatchId without dynamic nonces/counters.
 * 3. Scope and TOCTOU protection: Rigorous commit SHA and SOW version binding.
 */

import crypto from 'crypto';
import { Milestone, ReleaseAssessment, PolicyStatus } from '@/types/escrow';

/**
 * Result structure returned by evaluateReleasePolicy.
 */
export interface PolicyEvaluationResult {
  decision: Exclude<PolicyStatus, 'NOT_EVALUATED'>;
  reasons: string[];
}

/**
 * Generates a strictly deterministic payout batch identifier using SHA-256.
 *
 * Crucial rule: Never include an attempt counter or dynamic timestamp so retries
 * for the same operation remain strictly idempotent across network disruptions.
 *
 * @param contractId Unique contract identifier
 * @param milestoneId Unique milestone identifier
 * @param releaseOpId Unique release operation identifier
 * @returns Deterministic batch ID formatted as `aegis-v1-${hash.substring(0, 24)}`
 */
export function generatePayoutBatchId(
  contractId: string,
  milestoneId: string,
  releaseOpId: string
): string {
  const payload = `${contractId.trim()}:${milestoneId.trim()}:${releaseOpId.trim()}`;
  const hash = crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
  return `aegis-v1-${hash.substring(0, 24)}`;
}

/**
 * Generates a deterministic SHA-256 hash of the milestone acceptance criteria.
 * Deterministically sorts criteria strings to bind contracts to an immutable version.
 *
 * @param acceptanceCriteria Array of acceptance criteria statements
 * @returns Hex-encoded SHA-256 hash string
 */
export function generateSowHash(acceptanceCriteria: string[]): string {
  const normalized = [...acceptanceCriteria].map((c) => c.trim()).sort();
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(normalized), 'utf8')
    .digest('hex');
}

/**
 * Validates cryptographic evidence binding between the assessed submission and the target milestone.
 *
 * Prevents TOCTOU (Time-Of-Check to Time-Of-Use) and scope-mismatch attacks:
 * - Confirms that assessment.submissionCommitSha === milestone.submission?.commitSha
 * - Confirms that assessment.sowVersionHash === milestone.sowVersionHash
 *
 * @param milestone The target escrow milestone
 * @param assessment The advisory AI release assessment
 * @returns true if evidence is strictly bound, false otherwise
 */
export function validateEvidenceBinding(
  milestone: Milestone,
  assessment: ReleaseAssessment
): boolean {
  if (!milestone.submission?.commitSha) {
    return false;
  }

  const commitMatches = assessment.submissionCommitSha === milestone.submission.commitSha;
  const sowMatches = assessment.sowVersionHash === milestone.sowVersionHash;

  return commitMatches && sowMatches;
}

/**
 * Deterministic policy gate evaluating whether a milestone qualifies for autonomous payout,
 * requires human sign-off, or must be rejected.
 *
 * @param milestone The target escrow milestone
 * @param assessment The advisory AI release assessment
 * @returns Policy decision and specific reasons
 */
export function evaluateReleasePolicy(
  milestone: Milestone,
  assessment: ReleaseAssessment
): PolicyEvaluationResult {
  const reasons: string[] = [];

  // Check 1 (Immediate Rejection):
  // If !deterministicChecksPassed OR !securityChecksPassed OR !validateEvidenceBinding
  if (!assessment.deterministicChecksPassed) {
    reasons.push('Automated deterministic tests or test suite verification failed.');
  }

  if (!assessment.securityChecksPassed) {
    reasons.push('Security and vulnerability checks failed.');
  }

  if (!validateEvidenceBinding(milestone, assessment)) {
    reasons.push(
      'Evidence binding mismatch: Assessment commit SHA or SOW hash does not match milestone submission.'
    );
  }

  if (milestone.payoutStatus === 'HALTED') {
    reasons.push('Payout is currently HALTED due to an active dispute or administrative freeze.');
  }

  if (reasons.length > 0) {
    return {
      decision: 'REJECTED',
      reasons,
    };
  }

  const isWithinAutonomousCap =
    milestone.money.amountMinor <= milestone.maxAutonomousLimitMinor;

  // Check 2 (Autonomous Fast-Track):
  // - If confidenceScore >= 90
  // - AND amountMinor <= maxAutonomousLimitMinor (Blast Radius Cap, e.g. <= $200.00)
  // - AND no open disputes / halts
  if (assessment.confidenceScore >= 90 && isWithinAutonomousCap) {
    reasons.push(
      `Autonomous approval granted: High AI confidence (${assessment.confidenceScore}/100) and amount ($${(
        milestone.money.amountMinor / 100
      ).toFixed(2)}) is within autonomous limit ($${(
        milestone.maxAutonomousLimitMinor / 100
      ).toFixed(2)}).`
    );
    return {
      decision: 'AUTONOMOUS_APPROVED',
      reasons,
    };
  }

  // Check 3 (Human-in-the-Loop Fallback):
  // - If score is between 60 and 89, OR if amountMinor > maxAutonomousLimitMinor
  if (assessment.confidenceScore >= 60) {
    if (!isWithinAutonomousCap) {
      reasons.push(
        `Amount ($${(milestone.money.amountMinor / 100).toFixed(
          2
        )}) exceeds max autonomous limit ($${(
          milestone.maxAutonomousLimitMinor / 100
        ).toFixed(2)}); mandatory client human sign-off required.`
      );
    }
    if (assessment.confidenceScore < 90) {
      reasons.push(
        `Confidence score (${assessment.confidenceScore}/100) requires human sign-off before fund release.`
      );
    }
    return {
      decision: 'REQUIRES_HUMAN_SIGN_OFF',
      reasons,
    };
  }

  // Fallback: Return REJECTED if confidence is below 60
  reasons.push(
    `Confidence score (${assessment.confidenceScore}/100) is below acceptable threshold (60).`
  );
  return {
    decision: 'REJECTED',
    reasons,
  };
}

/**
 * Calculates ISO timestamps for the cooling-off / dispute challenge window.
 *
 * @param seconds Duration of the challenge window in seconds
 * @returns ISO timestamps for window start and end
 */
export function calculateChallengeWindow(seconds: number): {
  startsAt: string;
  endsAt: string;
} {
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + seconds * 1000);

  return {
    startsAt: startDate.toISOString(),
    endsAt: endDate.toISOString(),
  };
}
