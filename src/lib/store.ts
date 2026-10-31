/**
 * AegisPay In-Memory State Store
 *
 * Provides a thread-safe singleton state container pre-seeded with realistic
 * milestone deliverables and an append-only PayPal Webhook telemetry ledger.
 */

import { Milestone, PayPalTelemetryEvent } from '@/types/escrow';
import { generateSowHash } from './policyEngine';

/**
 * Pre-seeds 3 realistic demo milestones covering:
 * 1. Autonomous fast-track candidate (<= $200 limit, clean spec)
 * 2. High-value human sign-off candidate (> $200 limit)
 * 3. Security rejection / dispute freeze candidate
 */
function createInitialMilestones(): Milestone[] {
  const criteria1 = [
    'All unit tests pass',
    'OAuth2 callback handles 401 correctly',
    'JWT tokens stored in secure cookie',
  ];

  const criteria2 = [
    'Reentrancy guard implemented',
    'Gas optimization benchmark < 50k',
    'Audit report signed',
  ];

  const criteria3 = [
    'Sensitive PII scrubbed from stack traces',
    'Linter passes with zero warnings',
  ];

  return [
    {
      id: 'ms-101',
      contractId: 'cnt-aegis-01',
      title: 'Implement Auth Flow & OAuth2 Handshake',
      description: 'End-to-end OAuth2 token exchange with Next.js App Router and secure session cookies.',
      money: {
        amountMinor: 15000, // $150.00
        currency: 'USD',
      },
      contractorEmail: 'contractor-dev@aegispay.dev',
      clientEmail: 'client-admin@aegispay.dev',
      acceptanceCriteria: criteria1,
      sowVersionHash: generateSowHash(criteria1),
      maxAutonomousLimitMinor: 20000, // $200.00
      challengeWindowSeconds: 15, // 15 seconds for quick live demo verification
      verificationStatus: 'NOT_STARTED',
      policyStatus: 'NOT_EVALUATED',
      payoutStatus: 'NOT_CREATED',
      telemetry: [],
      version: 1,
    },
    {
      id: 'ms-102',
      contractId: 'cnt-aegis-01',
      title: 'Smart Contract Core & Settlement Engine',
      description: 'Escrow settlement contract handling milestone dispute timeouts and multi-party claims.',
      money: {
        amountMinor: 45000, // $450.00 (Exceeds $200 autonomous cap)
        currency: 'USD',
      },
      contractorEmail: 'contractor-dev@aegispay.dev',
      clientEmail: 'client-admin@aegispay.dev',
      acceptanceCriteria: criteria2,
      sowVersionHash: generateSowHash(criteria2),
      maxAutonomousLimitMinor: 20000, // $200.00
      challengeWindowSeconds: 15,
      verificationStatus: 'NOT_STARTED',
      policyStatus: 'NOT_EVALUATED',
      payoutStatus: 'NOT_CREATED',
      telemetry: [],
      version: 1,
    },
    {
      id: 'ms-103',
      contractId: 'cnt-aegis-01',
      title: 'Telemetry & Sentry Logging Pipeline',
      description: 'Data ingestion and sanitized audit stream pipeline for real-time observability.',
      money: {
        amountMinor: 8000, // $80.00
        currency: 'USD',
      },
      contractorEmail: 'contractor-dev@aegispay.dev',
      clientEmail: 'client-admin@aegispay.dev',
      acceptanceCriteria: criteria3,
      sowVersionHash: generateSowHash(criteria3),
      maxAutonomousLimitMinor: 20000, // $200.00
      challengeWindowSeconds: 15,
      verificationStatus: 'NOT_STARTED',
      policyStatus: 'NOT_EVALUATED',
      payoutStatus: 'NOT_CREATED',
      telemetry: [],
      version: 1,
    },
  ];
}

// Global singleton pattern to maintain state across Next.js dev server hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var __aegispay_milestones__: Milestone[] | undefined;
  // eslint-disable-next-line no-var
  var __aegispay_telemetry__: PayPalTelemetryEvent[] | undefined;
}

if (!globalThis.__aegispay_milestones__) {
  globalThis.__aegispay_milestones__ = createInitialMilestones();
}

if (!globalThis.__aegispay_telemetry__) {
  globalThis.__aegispay_telemetry__ = [];
}

/**
 * Returns a cloned list of all active milestones in the store.
 */
export function getMilestones(): Milestone[] {
  return [...(globalThis.__aegispay_milestones__ || [])];
}

/**
 * Retrieves a single milestone by its unique ID.
 */
export function getMilestoneById(id: string): Milestone | undefined {
  const items = globalThis.__aegispay_milestones__ || [];
  return items.find((m) => m.id === id);
}

/**
 * Applies a partial update atomically to a target milestone.
 *
 * @param id Milestone ID
 * @param partial Fields to patch
 * @returns Updated Milestone or undefined if not found
 */
export function updateMilestone(
  id: string,
  partial: Partial<Milestone>
): Milestone | undefined {
  const items = globalThis.__aegispay_milestones__ || [];
  const index = items.findIndex((m) => m.id === id);
  if (index === -1) {
    return undefined;
  }

  const existing = items[index];
  const updated: Milestone = {
    ...existing,
    ...partial,
    version: existing.version + 1,
  };

  items[index] = updated;
  globalThis.__aegispay_milestones__ = items;
  return updated;
}

/**
 * Records an incoming or generated PayPal webhook telemetry event.
 */
export function recordTelemetryEvent(event: PayPalTelemetryEvent): void {
  if (!globalThis.__aegispay_telemetry__) {
    globalThis.__aegispay_telemetry__ = [];
  }
  globalThis.__aegispay_telemetry__.push(event);

  // Sync to milestone's telemetry array
  const milestone = getMilestoneById(event.milestoneId);
  if (milestone) {
    const existingEvents = milestone.telemetry || [];
    updateMilestone(event.milestoneId, {
      telemetry: [...existingEvents, event],
    });
  }
}

/**
 * Retrieves chronological telemetry events for a specific milestone.
 */
export function getTelemetryForMilestone(milestoneId: string): PayPalTelemetryEvent[] {
  const all = globalThis.__aegispay_telemetry__ || [];
  return all.filter((e) => e.milestoneId === milestoneId);
}

/**
 * Retrieves all recorded PayPal telemetry events across all contracts.
 */
export function getAllTelemetryEvents(): PayPalTelemetryEvent[] {
  return [...(globalThis.__aegispay_telemetry__ || [])];
}

/**
 * Resets the in-memory store back to initial pre-seeded values.
 */
export function resetStore(): Milestone[] {
  globalThis.__aegispay_milestones__ = createInitialMilestones();
  globalThis.__aegispay_telemetry__ = [];
  return [...globalThis.__aegispay_milestones__];
}
