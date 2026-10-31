'use client';

import React, { useEffect, useState } from 'react';
import { Milestone, formatMinorToUSD } from '@/types/escrow';
import {
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Lock,
  CheckCircle2,
  XCircle,
  X,
  FileCode2,
  DollarSign,
  Cpu,
  Copy,
  Check,
  Code2,
  ChevronDown,
  ChevronRight,
  Radio,
  Clock,
  ArrowRight,
  Award,
} from 'lucide-react';

interface AuditDrawerProps {
  milestone: Milestone | null;
  onClose: () => void;
  onViewCertificate?: (milestone: Milestone) => void;
}

export function AuditDrawer({
  milestone,
  onClose,
  onViewCertificate,
}: AuditDrawerProps) {
  const [copiedBatchId, setCopiedBatchId] = useState(false);
  const [copiedCommitSha, setCopiedCommitSha] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [selectedEventIndex, setSelectedEventIndex] = useState(0);

  // Listen for Escape key to close the drawer cleanly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!milestone) return null;

  const { submission, assessment, payout, telemetry = [] } = milestone;

  const handleCopyBatchId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBatchId(true);
    setTimeout(() => setCopiedBatchId(false), 2000);
  };

  const handleCopyCommitSha = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommitSha(true);
    setTimeout(() => setCopiedCommitSha(false), 2000);
  };

  const handleCopyJson = (obj: any) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const currentPayloadToDisplay =
    telemetry.length > 0
      ? telemetry[selectedEventIndex]?.rawPayload || telemetry[0].rawPayload
      : payout || {};

  // Lifecycle Progression Calculations
  const isStep1Done = Boolean(submission?.commitSha);
  const isStep2Done = Boolean(assessment?.deterministicChecksPassed);
  const isStep3Done = Boolean(assessment);
  const isStep4Done =
    milestone.policyStatus === 'AUTONOMOUS_APPROVED' ||
    (milestone.policyStatus === 'REQUIRES_HUMAN_SIGN_OFF' &&
      (milestone.payoutStatus === 'SUCCESS' || milestone.payoutStatus === 'SUBMITTED'));
  const isStep5Done =
    milestone.payoutStatus === 'SUCCESS' || milestone.payoutStatus === 'SUBMITTED';

  const lifecycleSteps = [
    {
      title: 'Deliverable Submitted',
      detail: submission ? `Commit ${submission.commitSha.substring(0, 7)}` : 'Awaiting PR submission',
      status: isStep1Done ? 'complete' : 'pending',
    },
    {
      title: 'Deterministic CI Passed',
      detail: assessment
        ? assessment.deterministicChecksPassed
          ? 'Automated tests & assertions passed'
          : 'CI test suite failures detected'
        : 'Pending verification',
      status: isStep2Done ? 'complete' : assessment ? 'failed' : 'pending',
    },
    {
      title: 'Advisory AI Assessment',
      detail: assessment
        ? `${assessment.confidenceScore}% confidence score`
        : 'Read-only compliance audit',
      status: isStep3Done ? 'complete' : isStep1Done ? 'active' : 'pending',
    },
    {
      title: 'Policy Authorization',
      detail:
        milestone.policyStatus === 'AUTONOMOUS_APPROVED'
          ? 'Autonomous clearance within limits'
          : milestone.policyStatus === 'REQUIRES_HUMAN_SIGN_OFF'
          ? 'Client human sign-off gate'
          : milestone.policyStatus === 'REJECTED'
          ? 'Policy firewall rejected'
          : 'Invariant boundary check',
      status: isStep4Done
        ? 'complete'
        : milestone.policyStatus === 'REJECTED'
        ? 'failed'
        : isStep3Done
        ? 'active'
        : 'pending',
    },
    {
      title: 'PayPal Settlement Confirmed',
      detail:
        milestone.payoutStatus === 'SUCCESS' || milestone.payoutStatus === 'SUBMITTED'
          ? `Settled via PayPal (ID: ${payout?.paypalPayoutBatchId?.substring(0, 14)}...)`
          : milestone.payoutStatus === 'CHALLENGE_COOLING'
          ? 'Cooling dispute window active'
          : 'Disbursement escrow locked',
      status: isStep5Done
        ? 'complete'
        : milestone.payoutStatus === 'CHALLENGE_COOLING'
        ? 'active'
        : 'pending',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Milestone Audit Details"
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm transition-opacity cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div
        className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-slate-800 bg-slate-950 p-6 shadow-2xl text-slate-100 cursor-default space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
                {milestone.id}
              </span>
              <span className="font-mono text-xs text-slate-400">
                v{milestone.version}
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              {milestone.title}
            </h2>
            <p className="text-sm text-slate-400">{milestone.description}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close Drawer"
            className="relative z-20 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            title="Close Drawer (Esc)"
          >
            <X className="h-5 w-5 pointer-events-none" />
          </button>
        </div>

        {/* Overview Metric Pills */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <div className="text-xs text-slate-400">Milestone Value</div>
            <div className="text-lg font-bold text-white">
              {formatMinorToUSD(milestone.money.amountMinor)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <div className="text-xs text-slate-400">Autonomous Limit</div>
            <div className="text-lg font-bold text-emerald-400">
              {formatMinorToUSD(milestone.maxAutonomousLimitMinor)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <div className="text-xs text-slate-400">Challenge Window</div>
            <div className="text-lg font-bold text-indigo-400">
              {milestone.challengeWindowSeconds}s
            </div>
          </div>
        </div>

        {/* Verified Lifecycle Progression Stepper */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Verified Milestone Workflow Progression</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400">
              {isStep5Done
                ? '5/5 Complete'
                : isStep4Done
                ? '4/5 Complete'
                : isStep3Done
                ? '3/5 Complete'
                : isStep1Done
                ? '1/5 Complete'
                : '0/5 Pending'}
            </span>
          </div>

          <div className="space-y-2 pt-1">
            {lifecycleSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      step.status === 'complete'
                        ? 'bg-emerald-500 text-slate-950'
                        : step.status === 'failed'
                        ? 'bg-rose-500 text-white'
                        : step.status === 'active'
                        ? 'bg-indigo-500 text-white animate-pulse'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {step.status === 'complete' ? (
                      <Check className="h-3 w-3 stroke-[3]" />
                    ) : step.status === 'failed' ? (
                      <X className="h-3 w-3 stroke-[3]" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  {idx < lifecycleSteps.length - 1 && (
                    <div
                      className={`h-4 w-0.5 ${
                        step.status === 'complete'
                          ? 'bg-emerald-500/60'
                          : 'bg-slate-800'
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-medium ${
                        step.status === 'complete'
                          ? 'text-slate-100'
                          : step.status === 'failed'
                          ? 'text-rose-300'
                          : step.status === 'active'
                          ? 'text-indigo-300'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block -mt-0.5 font-mono">
                    {step.detail}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 1: Immutable Evidence & TOCTOU Protection */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-sky-400">
            <FileCode2 className="h-4 w-4" />
            <span>Immutable Deliverable Evidence</span>
          </div>

          {submission ? (
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400">Repository: </span>
                <a
                  href={submission.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-sky-400 underline inline-flex items-center gap-1 hover:text-sky-300"
                >
                  {submission.repoUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-0.5">
                  <span>Commit SHA (TOCTOU Proof):</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCommitSha(submission.commitSha)}
                    className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer"
                  >
                    {copiedCommitSha ? (
                      <>
                        <Check className="h-3 w-3" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy SHA
                      </>
                    )}
                  </button>
                </div>
                <span className="font-mono text-slate-200 bg-slate-950 px-2 py-1 rounded border border-slate-800 block break-all">
                  {submission.commitSha}
                </span>
              </div>
              <div>
                <span className="text-slate-400">SOW Spec Hash: </span>
                <span className="font-mono text-slate-400 break-all">
                  {milestone.sowVersionHash}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Test Artifact Hash: </span>
                <span className="font-mono text-slate-400 break-all">
                  {submission.testArtifactHash}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Submitted At: </span>
                <span className="text-slate-300">
                  {new Date(submission.submittedAt).toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              No deliverable has been submitted yet for this milestone.
            </p>
          )}
        </div>

        {/* Section 2: AI Compliance Assessment */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-purple-400">
              <Cpu className="h-4 w-4" />
              <span>AI Compliance Assessment</span>
              <span className="text-[10px] font-mono text-purple-400/90 bg-purple-950/60 border border-purple-800/80 px-2 py-0.5 rounded-full font-normal">
                Advisory Only • Non-Binding
              </span>
            </div>
            {assessment && (
              <span className="font-mono text-xs text-purple-300 bg-purple-950/70 border border-purple-800 px-2 py-0.5 rounded">
                {assessment.confidenceScore}% Confidence
              </span>
            )}
          </div>

          {assessment ? (
            <div className="space-y-3 text-xs">
              {/* Confidence bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    assessment.confidenceScore >= 90
                      ? 'bg-emerald-500'
                      : assessment.confidenceScore >= 60
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${assessment.confidenceScore}%` }}
                />
              </div>

              {/* Sub-check badges */}
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  {assessment.deterministicChecksPassed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-400" />
                  )}
                  <span className="text-slate-300">Deterministic Tests</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {assessment.securityChecksPassed ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                  )}
                  <span className="text-slate-300">Security Invariants</span>
                </div>
              </div>

              <div className="rounded border border-slate-800/80 bg-slate-950/80 p-3">
                <span className="text-slate-400 font-semibold">Auditor Reasoning:</span>
                <p className="mt-1 text-slate-200 leading-relaxed font-sans">
                  {assessment.reasoning}
                </p>
              </div>

              {/* Detected Risks & Injection Anomalies */}
              {assessment.detectedRisks && assessment.detectedRisks.length > 0 && (
                <div className="rounded border border-rose-900/50 bg-rose-950/30 p-3 space-y-1">
                  <span className="text-rose-400 font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Detected Anomalies & Invariant Flags:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-rose-300/90 font-mono text-[11px]">
                    {assessment.detectedRisks.map((risk, idx) => (
                      <li key={idx}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              Awaiting contractor deliverable submission for evaluation.
            </p>
          )}
        </div>

        {/* Section 3: Financial Execution & PayPal Idempotency Ledger */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <DollarSign className="h-4 w-4" />
              <span>PayPal Settlement & Idempotency Ledger</span>
            </div>
            {payout?.paypalPayoutBatchId && (
              <a
                href="https://developer.paypal.com/dashboard/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded bg-sky-950/70 border border-sky-800 px-2 py-1 text-[11px] font-medium text-sky-300 hover:bg-sky-900/80 hover:text-white transition-colors"
                title="Open Sandbox Dashboard in new tab"
              >
                <span>PayPal Dashboard</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400">Contractor Recipient: </span>
              <span className="font-mono text-slate-200">
                {milestone.contractorEmail}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Payout Status: </span>
              <span className="font-semibold text-slate-100">
                {milestone.payoutStatus}
              </span>
            </div>

            {payout ? (
              <div className="space-y-2 pt-1">
                {/* Sender Batch ID with Copy */}
                <div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Deterministic Sender Batch ID (Idempotency Key):</span>
                    <button
                      type="button"
                      onClick={() => handleCopyBatchId(payout.senderBatchId)}
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      {copiedBatchId ? (
                        <>
                          <Check className="h-3 w-3" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copy Batch ID
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-emerald-300 bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800 break-all mt-1">
                    {payout.senderBatchId}
                  </div>
                </div>

                {payout.paypalPayoutBatchId && (
                  <div>
                    <span className="text-slate-400">PayPal Batch ID: </span>
                    <span className="font-mono text-sky-400">
                      {payout.paypalPayoutBatchId}
                    </span>
                  </div>
                )}

                {payout.paypalTransactionId && (
                  <div>
                    <span className="text-slate-400">PayPal Transaction ID: </span>
                    <span className="font-mono text-emerald-300">
                      {payout.paypalTransactionId}
                    </span>
                  </div>
                )}

                {payout.completedAt && (
                  <div>
                    <span className="text-slate-400">Settled At: </span>
                    <span className="text-slate-300">
                      {new Date(payout.completedAt).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* View Settlement Certificate Button */}
                {(milestone.payoutStatus === 'SUCCESS' ||
                  milestone.payoutStatus === 'SUBMITTED') && (
                  <button
                    type="button"
                    onClick={() => onViewCertificate?.(milestone)}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2.5 px-3 text-xs font-semibold text-white transition-colors shadow-sm cursor-pointer"
                  >
                    <Award className="h-4 w-4" />
                    View Verified Settlement Certificate
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500 pt-1">
                <Lock className="h-3.5 w-3.5" />
                <span>
                  Disbursement escrow locked. Payout operation will instantiate upon clearance.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: PayPal Telemetry & Webhook Lifecycle Timeline */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-sky-400">
              <Radio className="h-4 w-4 text-sky-400" />
              <span>PayPal Webhook & Telemetry Lifecycle</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {telemetry.length} Events Received
            </span>
          </div>

          {telemetry.length > 0 ? (
            <div className="space-y-3">
              {/* Stepper Timeline */}
              <div className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {telemetry.map((event, idx) => (
                  <div
                    key={event.id || idx}
                    onClick={() => setSelectedEventIndex(idx)}
                    className={`relative cursor-pointer group p-2 rounded-lg border transition-all ${
                      selectedEventIndex === idx
                        ? 'border-sky-500/50 bg-sky-950/20'
                        : 'border-slate-800/80 bg-slate-950/50 hover:border-slate-700'
                    }`}
                  >
                    {/* Stepper Node Dot */}
                    <div
                      className={`absolute -left-[21px] top-3.5 h-2.5 w-2.5 rounded-full border-2 ${
                        event.eventType.includes('SUCCEEDED') || event.eventType.includes('SUCCESS')
                          ? 'border-emerald-500 bg-emerald-400'
                          : event.eventType.includes('PROCESSING')
                          ? 'border-amber-500 bg-amber-400'
                          : 'border-sky-500 bg-sky-400'
                      }`}
                    />
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-slate-200">
                        {event.eventType}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400 leading-snug">
                      {event.summary}
                    </p>
                  </div>
                ))}
              </div>

              {/* Raw JSON Accordion */}
              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/90">
                <button
                  type="button"
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <Code2 className="h-3.5 w-3.5 text-sky-400" />
                    <span>Raw PayPal Payload Inspector</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      ({telemetry[selectedEventIndex]?.eventType || 'Webhook Response'})
                    </span>
                  </div>
                  {showRawJson ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                </button>

                {showRawJson && (
                  <div className="border-t border-slate-800 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        JSON Response Structure
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyJson(currentPayloadToDisplay)}
                        className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer"
                      >
                        {copiedJson ? (
                          <>
                            <Check className="h-3 w-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy JSON
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="max-h-56 overflow-auto rounded bg-slate-900/90 p-2.5 font-mono text-[11px] text-emerald-300 border border-slate-800/80 leading-relaxed">
                      {JSON.stringify(currentPayloadToDisplay, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              No PayPal webhook events received yet. Disburse this milestone to view live asynchronous telemetry.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
