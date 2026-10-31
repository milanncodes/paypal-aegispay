'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams, GridApi, GridReadyEvent } from 'ag-grid-community';
import { Milestone, formatMinorToUSD } from '@/types/escrow';
import {
  CheckCircle2,
  Clock,
  Lock,
  Send,
  Eye,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  Coins,
  XCircle,
  ShieldCheck,
  Search,
  Download,
  X,
  Filter,
  BarChart3,
  Layers,
  ShieldAlert,
  Award,
} from 'lucide-react';

type CategoryFilter = 'ALL' | 'VERIFIED' | 'SIGN_OFF' | 'SETTLED' | 'SAFEGUARD';

interface MilestoneGridProps {
  milestones: Milestone[];
  loading?: boolean;
  processingId?: string | null;
  onRefresh: () => void;
  onInspect: (milestone: Milestone) => void;
  onSubmitPR: (milestoneId: string) => void;
  onHalt: (milestoneId: string) => void;
  onRelease: (milestoneId: string, forceClientApproval?: boolean) => void;
  onViewCertificate?: (milestone: Milestone) => void;
}

export function MilestoneGrid({
  milestones,
  loading = false,
  processingId = null,
  onRefresh,
  onInspect,
  onSubmitPR,
  onHalt,
  onRelease,
  onViewCertificate,
}: MilestoneGridProps) {
  // Live ticker for cooling window countdown
  const [now, setNow] = useState(Date.now());
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [quickFilterText, setQuickFilterText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
  }, []);

  const handleExportCSV = useCallback(() => {
    if (!gridApi) return;
    gridApi.exportDataAsCsv({
      fileName: `aegispay-ledger-${Date.now()}.csv`,
    });
  }, [gridApi]);

  // Filter milestones based on selected Portfolio Intelligence category
  const filteredMilestones = useMemo(() => {
    switch (categoryFilter) {
      case 'VERIFIED':
        return milestones.filter(
          (m) =>
            m.verificationStatus === 'PASSED' ||
            m.policyStatus === 'AUTONOMOUS_APPROVED'
        );
      case 'SIGN_OFF':
        return milestones.filter(
          (m) => m.policyStatus === 'REQUIRES_HUMAN_SIGN_OFF'
        );
      case 'SETTLED':
        return milestones.filter(
          (m) => m.payoutStatus === 'SUCCESS' || m.payoutStatus === 'SUBMITTED'
        );
      case 'SAFEGUARD':
        return milestones.filter(
          (m) =>
            m.policyStatus === 'REJECTED' ||
            m.payoutStatus === 'HALTED' ||
            m.verificationStatus === 'FAILED'
        );
      case 'ALL':
      default:
        return milestones;
    }
  }, [milestones, categoryFilter]);

  // Capital Distribution & Portfolio Analytics Calculations
  const analytics = useMemo(() => {
    const totalMinor = milestones.reduce((sum, m) => sum + m.money.amountMinor, 0);

    const settledMinor = milestones
      .filter((m) => m.payoutStatus === 'SUCCESS' || m.payoutStatus === 'SUBMITTED')
      .reduce((sum, m) => sum + m.money.amountMinor, 0);

    const coolingMinor = milestones
      .filter((m) => m.payoutStatus === 'CHALLENGE_COOLING')
      .reduce((sum, m) => sum + m.money.amountMinor, 0);

    const signOffMinor = milestones
      .filter(
        (m) =>
          m.policyStatus === 'REQUIRES_HUMAN_SIGN_OFF' &&
          m.payoutStatus !== 'SUCCESS' &&
          m.payoutStatus !== 'SUBMITTED'
      )
      .reduce((sum, m) => sum + m.money.amountMinor, 0);

    const safeguardMinor = milestones
      .filter(
        (m) =>
          m.policyStatus === 'REJECTED' ||
          m.payoutStatus === 'HALTED' ||
          m.verificationStatus === 'FAILED'
      )
      .reduce((sum, m) => sum + m.money.amountMinor, 0);

    const safeTotal = totalMinor || 1;
    const settledPct = Math.round((settledMinor / safeTotal) * 100);
    const coolingPct = Math.round((coolingMinor / safeTotal) * 100);
    const signOffPct = Math.round((signOffMinor / safeTotal) * 100);
    const safeguardPct = Math.max(0, 100 - settledPct - coolingPct - signOffPct);

    const verifiedCount = milestones.filter(
      (m) =>
        m.verificationStatus === 'PASSED' ||
        m.policyStatus === 'AUTONOMOUS_APPROVED'
    ).length;

    const signOffCount = milestones.filter(
      (m) => m.policyStatus === 'REQUIRES_HUMAN_SIGN_OFF'
    ).length;

    const settledCount = milestones.filter(
      (m) => m.payoutStatus === 'SUCCESS' || m.payoutStatus === 'SUBMITTED'
    ).length;

    const safeguardCount = milestones.filter(
      (m) =>
        m.policyStatus === 'REJECTED' ||
        m.payoutStatus === 'HALTED' ||
        m.verificationStatus === 'FAILED'
    ).length;

    return {
      totalMinor,
      settledMinor,
      coolingMinor,
      signOffMinor,
      safeguardMinor,
      settledPct,
      coolingPct,
      signOffPct,
      safeguardPct,
      verifiedCount,
      signOffCount,
      settledCount,
      safeguardCount,
    };
  }, [milestones]);

  // Standard AG Grid default column definition showcasing sorting, filtering, and resizing
  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  // Pinned bottom summary row calculating financial totals dynamically for current view
  const pinnedBottomRowData = useMemo(() => {
    if (!filteredMilestones.length) return [];
    const totalAmountMinor = filteredMilestones.reduce(
      (sum, m) => sum + m.money.amountMinor,
      0
    );
    const passedCount = filteredMilestones.filter(
      (m) => m.verificationStatus === 'PASSED'
    ).length;
    const passedPct = Math.round(
      (passedCount / filteredMilestones.length) * 100
    );

    const approvedCount = filteredMilestones.filter(
      (m) => m.policyStatus === 'AUTONOMOUS_APPROVED'
    ).length;
    const approvedPct = Math.round(
      (approvedCount / filteredMilestones.length) * 100
    );

    const disbursedMinor = filteredMilestones
      .filter((m) => m.payoutStatus === 'SUCCESS' || m.payoutStatus === 'SUBMITTED')
      .reduce((sum, m) => sum + m.money.amountMinor, 0);

    return [
      {
        id: 'TOTAL',
        title:
          categoryFilter === 'ALL'
            ? 'TOTAL CONTRACT VALUE'
            : `FILTERED TOTAL (${categoryFilter})`,
        money: { amountMinor: totalAmountMinor, currency: 'USD' as const },
        contractorEmail: `${filteredMilestones.length} Displayed Deliverables`,
        verificationStatus: `${passedCount}/${filteredMilestones.length} Passed (${passedPct}%)`,
        policyStatus: `${approvedCount}/${filteredMilestones.length} Approved (${approvedPct}%)`,
        payoutStatus: `${formatMinorToUSD(disbursedMinor)} Settled`,
        isPinnedSummary: true,
      },
    ];
  }, [filteredMilestones, categoryFilter]);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: 'id',
        headerName: 'ID',
        width: 90,
        pinned: 'left',
        cellRenderer: (params: ICellRendererParams) => {
          if (params.node.isRowPinned()) {
            return (
              <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-wider">
                SUM
              </span>
            );
          }
          return (
            <span className="font-mono text-xs font-semibold text-slate-300">
              {params.value}
            </span>
          );
        },
      },
      {
        field: 'title',
        headerName: 'Milestone Deliverable',
        flex: 2,
        minWidth: 260,
        cellRenderer: (params: ICellRendererParams) => {
          if (params.node.isRowPinned()) {
            return (
              <div className="flex flex-col justify-center py-1">
                <span className="font-bold text-slate-100 text-xs tracking-wider uppercase">
                  {params.value}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {params.data?.contractorEmail}
                </span>
              </div>
            );
          }
          return (
            <div className="flex flex-col justify-center py-1">
              <span className="font-medium text-slate-100 text-sm">
                {params.value}
              </span>
              <span className="text-xs text-slate-400">
                Contractor: {params.data?.contractorEmail}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Amount',
        width: 115,
        valueGetter: (params) => params.data?.money?.amountMinor,
        cellRenderer: (params: ICellRendererParams) => {
          const minor = params.value ?? 0;
          const isPinned = params.node.isRowPinned();
          return (
            <span
              className={`font-mono text-sm ${
                isPinned
                  ? 'font-bold text-emerald-300 underline decoration-emerald-500/50'
                  : 'font-semibold text-emerald-400'
              }`}
            >
              {formatMinorToUSD(minor)}
            </span>
          );
        },
      },
      {
        field: 'verificationStatus',
        headerName: 'Verification',
        minWidth: 140,
        flex: 1,
        enableCellChangeFlash: true,
        cellRenderer: (params: ICellRendererParams) => {
          if (params.node.isRowPinned()) {
            return (
              <span className="font-mono text-xs font-bold text-emerald-400">
                {params.value}
              </span>
            );
          }
          const status = params.value;
          if (status === 'PASSED') {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified
              </span>
            );
          }
          if (status === 'ANALYZING') {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Analyzing
              </span>
            );
          }
          if (status === 'FAILED') {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <XCircle className="h-3.5 w-3.5" />
                Failed Checks
              </span>
            );
          }
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/60 text-slate-400 border border-slate-700/60">
              Pending PR
            </span>
          );
        },
      },
      {
        field: 'policyStatus',
        headerName: 'Policy Decision',
        minWidth: 180,
        flex: 1,
        enableCellChangeFlash: true,
        cellRenderer: (params: ICellRendererParams) => {
          if (params.node.isRowPinned()) {
            return (
              <span className="font-mono text-xs font-bold text-amber-300">
                {params.value}
              </span>
            );
          }
          const status = params.value;
          if (status === 'AUTONOMOUS_APPROVED') {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-3.5 w-3.5" />
                Autonomous Approved
              </span>
            );
          }
          if (status === 'REQUIRES_HUMAN_SIGN_OFF') {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                <UserCheck className="h-3.5 w-3.5" />
                Client Sign-Off Req.
              </span>
            );
          }
          if (status === 'REJECTED') {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle className="h-3.5 w-3.5" />
                Policy Rejected
              </span>
            );
          }
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/60 text-slate-400 border border-slate-700/60">
              Not Evaluated
            </span>
          );
        },
      },
      {
        field: 'payoutStatus',
        headerName: 'Settlement',
        minWidth: 155,
        flex: 1,
        enableCellChangeFlash: true,
        cellRenderer: (params: ICellRendererParams) => {
          if (params.node.isRowPinned()) {
            return (
              <span className="font-mono text-xs font-bold text-emerald-400">
                {params.value}
              </span>
            );
          }
          const milestone = params.data;
          if (!milestone) return null;
          const status = milestone.payoutStatus;

          if (status === 'CHALLENGE_COOLING') {
            const endsAt = milestone.challengeEndsAt
              ? new Date(milestone.challengeEndsAt).getTime()
              : 0;
            const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));

            if (remaining > 0) {
              return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  <Clock className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
                  Cooling ({remaining}s)
                </span>
              );
            }
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Release Eligible
              </span>
            );
          }

          if (status === 'SUCCESS' || status === 'SUBMITTED') {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Coins className="h-3.5 w-3.5" />
                Settled (PayPal)
              </span>
            );
          }

          if (status === 'HALTED') {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle className="h-3.5 w-3.5" />
                Frozen (Dispute)
              </span>
            );
          }

          if (status === 'PROCESSING') {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Processing
              </span>
            );
          }

          if (status === 'UNKNOWN') {
            return (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Reconciling
              </span>
            );
          }

          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/60 text-slate-400 border border-slate-700/60">
              <Lock className="h-3 w-3" />
              In Escrow
            </span>
          );
        },
      },
      {
        headerName: 'Actions',
        width: 295,
        pinned: 'right',
        cellRenderer: (params: ICellRendererParams) => {
          if (params.node.isRowPinned()) {
            return (
              <span className="text-xs text-slate-500 italic flex items-center h-full">
                Ledger Summary
              </span>
            );
          }
          const m = params.data as Milestone;
          if (!m) return null;

          const isRowBusy = processingId === m.id;

          if (isRowBusy) {
            return (
              <div className="flex items-center gap-2 h-full">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30 animate-pulse">
                  <RefreshCw className="h-3 w-3 animate-spin text-sky-400" />
                  Submitting to PayPal...
                </span>
                <button
                  type="button"
                  onClick={() => onInspect(m)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700/80 cursor-pointer"
                  title="Inspect cryptographic evidence and audit assessment"
                >
                  <Eye className="h-3 w-3" />
                  Audit
                </button>
              </div>
            );
          }

          const isCoolingActive =
            m.payoutStatus === 'CHALLENGE_COOLING' &&
            m.challengeEndsAt &&
            new Date(m.challengeEndsAt).getTime() > now;

          const isCoolingExpired =
            m.payoutStatus === 'CHALLENGE_COOLING' &&
            m.challengeEndsAt &&
            new Date(m.challengeEndsAt).getTime() <= now;

          return (
            <div className="flex items-center gap-2 h-full">
              {/* Action 1: Submit PR if not started */}
              {m.verificationStatus === 'NOT_STARTED' && (
                <button
                  type="button"
                  disabled={isRowBusy}
                  onClick={() => onSubmitPR(m.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600/90 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-500 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Send className="h-3 w-3" />
                  Submit PR
                </button>
              )}

              {/* Action 2: Emergency Freeze if cooling */}
              {isCoolingActive && (
                <button
                  type="button"
                  disabled={isRowBusy}
                  onClick={() => onHalt(m.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600/90 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-500 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                  title="Pause release and register dispute"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Freeze / Dispute
                </button>
              )}

              {/* Action 3: Disburse Autonomous after cooling expires */}
              {isCoolingExpired && (
                <button
                  type="button"
                  disabled={isRowBusy}
                  onClick={() => onRelease(m.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/90 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                  title="Disburse cleared escrow via PayPal Payouts"
                >
                  <Coins className="h-3 w-3" />
                  Disburse via PayPal
                </button>
              )}

              {/* Action 4: Human-in-the-Loop Sign Off */}
              {m.policyStatus === 'REQUIRES_HUMAN_SIGN_OFF' &&
                m.payoutStatus !== 'SUCCESS' &&
                m.payoutStatus !== 'SUBMITTED' &&
                m.payoutStatus !== 'HALTED' && (
                  <button
                    type="button"
                    disabled={isRowBusy}
                    onClick={() => onRelease(m.id, true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600/90 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-500 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                    title="Client human sign-off authorization"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Authorize Sign-Off
                  </button>
                )}

              {/* Action 5: Settlement Certificate (Step 12) */}
              {(m.payoutStatus === 'SUCCESS' || m.payoutStatus === 'SUBMITTED') && (
                <button
                  type="button"
                  onClick={() => onViewCertificate?.(m)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white transition-colors border border-emerald-500/60 cursor-pointer shadow-sm"
                  title="View Cryptographic Settlement Certificate"
                >
                  <Award className="h-3 w-3 text-white" />
                  Certificate
                </button>
              )}

              {/* Action 6: Inspect Audit Drawer */}
              <button
                type="button"
                onClick={() => onInspect(m)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700/80 cursor-pointer"
                title="Inspect cryptographic evidence and audit assessment"
              >
                <Eye className="h-3 w-3" />
                Audit
              </button>
            </div>
          );
        },
      },
    ],
    [now, onHalt, onInspect, onRelease, onSubmitPR, onViewCertificate, processingId]
  );

  return (
    <div className="w-full space-y-4">
      {/* Portfolio Intelligence & Capital Flow Analytics (Step 11) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                Portfolio Intelligence & Capital Flow
                <span className="text-[11px] font-mono font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  Interactive Cross-Filter
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Select any segment below to dynamically cross-filter the AG Grid ledger and inspect focused deliverables.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/70 text-slate-300">
              Escrow Capital: <strong className="text-emerald-400 ml-1">{formatMinorToUSD(analytics.totalMinor)}</strong>
            </span>
          </div>
        </div>

        {/* Visual Capital Allocation Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Capital Allocation Breakdown</span>
            <span>{filteredMilestones.length} of {milestones.length} Milestones Visible</span>
          </div>
          <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
            <div
              style={{ width: `${analytics.settledPct}%` }}
              className="bg-emerald-500 transition-all duration-500 hover:opacity-90"
              title={`Settled via PayPal: ${formatMinorToUSD(analytics.settledMinor)} (${analytics.settledPct}%)`}
            />
            <div
              style={{ width: `${analytics.coolingPct}%` }}
              className="bg-purple-500 transition-all duration-500 hover:opacity-90"
              title={`Cooling / Release Eligible: ${formatMinorToUSD(analytics.coolingMinor)} (${analytics.coolingPct}%)`}
            />
            <div
              style={{ width: `${analytics.signOffPct}%` }}
              className="bg-amber-500 transition-all duration-500 hover:opacity-90"
              title={`Human Sign-Off Gate: ${formatMinorToUSD(analytics.signOffMinor)} (${analytics.signOffPct}%)`}
            />
            <div
              style={{ width: `${analytics.safeguardPct}%` }}
              className="bg-rose-500 transition-all duration-500 hover:opacity-90"
              title={`Safeguards / Disputes: ${formatMinorToUSD(analytics.safeguardMinor)} (${analytics.safeguardPct}%)`}
            />
          </div>
        </div>

        {/* Interactive KPI Filter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          {/* Filter 1: All */}
          <button
            type="button"
            onClick={() => setCategoryFilter('ALL')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
              categoryFilter === 'ALL'
                ? 'border-emerald-500/80 bg-emerald-950/30 ring-1 ring-emerald-500/40 shadow-lg'
                : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                All Escrow
              </span>
              <Layers className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <div className="mt-1 text-lg font-bold text-white font-mono">
              {milestones.length}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {formatMinorToUSD(analytics.totalMinor)}
            </span>
          </button>

          {/* Filter 2: Autonomous Verified */}
          <button
            type="button"
            onClick={() => setCategoryFilter('VERIFIED')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
              categoryFilter === 'VERIFIED'
                ? 'border-emerald-500/80 bg-emerald-950/30 ring-1 ring-emerald-500/40 shadow-lg'
                : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
                Verified Fast-Track
              </span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="mt-1 text-lg font-bold text-emerald-300 font-mono">
              {analytics.verifiedCount}
            </div>
            <span className="text-[11px] text-slate-400">
              ≤ $200 Cap
            </span>
          </button>

          {/* Filter 3: Client Sign-Off Gate */}
          <button
            type="button"
            onClick={() => setCategoryFilter('SIGN_OFF')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
              categoryFilter === 'SIGN_OFF'
                ? 'border-amber-500/80 bg-amber-950/30 ring-1 ring-amber-500/40 shadow-lg'
                : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-amber-400 uppercase tracking-wider">
                Client Sign-Off
              </span>
              <UserCheck className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="mt-1 text-lg font-bold text-amber-300 font-mono">
              {analytics.signOffCount}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {formatMinorToUSD(analytics.signOffMinor)}
            </span>
          </button>

          {/* Filter 4: Settled via PayPal */}
          <button
            type="button"
            onClick={() => setCategoryFilter('SETTLED')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
              categoryFilter === 'SETTLED'
                ? 'border-emerald-500/80 bg-emerald-950/30 ring-1 ring-emerald-500/40 shadow-lg'
                : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
                Disbursed
              </span>
              <Coins className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="mt-1 text-lg font-bold text-emerald-400 font-mono">
              {analytics.settledCount}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {formatMinorToUSD(analytics.settledMinor)}
            </span>
          </button>

          {/* Filter 5: Safeguards & Disputes */}
          <button
            type="button"
            onClick={() => setCategoryFilter('SAFEGUARD')}
            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
              categoryFilter === 'SAFEGUARD'
                ? 'border-rose-500/80 bg-rose-950/30 ring-1 ring-rose-500/40 shadow-lg'
                : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-rose-400 uppercase tracking-wider">
                Safeguards
              </span>
              <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
            </div>
            <div className="mt-1 text-lg font-bold text-rose-400 font-mono">
              {analytics.safeguardCount}
            </div>
            <span className="text-[11px] text-slate-400">
              Prompt Injection / Freeze
            </span>
          </button>
        </div>
      </div>

      {/* Main AG Grid Financial Ledger Container */}
      <div className="w-full rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur space-y-4">
        {/* Table Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Active Contract Milestones (Interactive AG Grid Financial Ledger)
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>
                  Showing {filteredMilestones.length} of {milestones.length} deliverables
                </span>
                {categoryFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-[11px] font-medium text-emerald-300">
                    <Filter className="h-2.5 w-2.5" /> Category: {categoryFilter}
                  </span>
                )}
                {quickFilterText.trim() && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-950/80 border border-sky-800 text-[11px] font-medium text-sky-300">
                    Search: &ldquo;{quickFilterText}&rdquo;
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Clear Filter button if active */}
            {(categoryFilter !== 'ALL' || quickFilterText) && (
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('ALL');
                  setQuickFilterText('');
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors shadow-sm cursor-pointer"
              >
                <X className="h-3 w-3 text-slate-400" />
                Reset Filters
              </button>
            )}

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors shadow-sm cursor-pointer"
              title="Export complete financial ledger as CSV"
            >
              <Download className="h-3.5 w-3.5 text-sky-400" />
              Export Ledger (CSV)
            </button>

            {/* Refresh Ledger Button */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Global Quick Search Filter Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              placeholder="Search contractor, deliverable, commit SHA, status, or PayPal batch..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950/80 py-2 pl-9 pr-9 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
            {quickFilterText && (
              <button
                type="button"
                onClick={() => setQuickFilterText('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                title="Clear Search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {quickFilterText && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs font-mono text-emerald-300">
              <Filter className="h-3 w-3" />
              Filter active
            </span>
          )}
        </div>

        {/* AG Grid Container */}
        <div
          className="ag-theme-alpine-dark w-full overflow-hidden rounded-lg border border-slate-800"
          style={{ height: 420 }}
        >
          <AgGridReact
            rowData={filteredMilestones}
            pinnedBottomRowData={pinnedBottomRowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            quickFilterText={quickFilterText}
            onGridReady={onGridReady}
            rowHeight={54}
            headerHeight={46}
            animateRows={true}
            overlayLoadingTemplate={'<span class="text-slate-400 text-sm">Synchronizing ledger...</span>'}
            overlayNoRowsTemplate={'<span class="text-slate-400 text-sm">No contract milestones matched your filter.</span>'}
          />
        </div>
      </div>
    </div>
  );
}
