# AegisPay — Intelligent Milestone Payments & Verified Contractor Payouts

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14.2_App_Router-black.svg?logo=next.js)](https://nextjs.org/)
[![AG Grid](https://img.shields.io/badge/AG_Grid-Enterprise--Ready_v32-blue.svg?logo=aggrid)](https://www.ag-grid.com/)
[![PayPal Payouts](https://img.shields.io/badge/PayPal-REST_Payouts_v1-003087.svg?logo=paypal)](https://developer.paypal.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict_v5.6-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)

> **An autonomous financial gateway that uses isolated AI to evaluate engineering deliverables, enforces deterministic policy guardrails, and executes verifiable disbursements via PayPal Sandbox & AG Grid.**

---

<p align="center">
  <a href="https://www.youtube.com/watch?v=QnwrlWVvFLQ" target="_blank" rel="noopener noreferrer">
    <img src="https://img.youtube.com/vi/QnwrlWVvFLQ/maxresdefault.jpg" alt="AegisPay Architecture Walkthrough & Live Demo" width="100%" style="max-width: 800px; border-radius: 8px;" />
  </a>
  <br />
  <em>▶️ Click above to watch the AegisPay demonstration & walkthrough on YouTube</em>
</p>

---

## 1. Why AegisPay Matters (The Problem)

In the global software contracting economy, two opposing frictions paralyze milestone settlement:
* **Contractor Friction:** Independent engineers and agencies often wait **14 to 30 days** for manual client reviews, PR approvals, and accounting wire disbursements.
* **Client Friction:** Project founders and enterprises risk disbursing escrow funds for deliverables containing broken tests, unverified specifications, or hidden security vulnerabilities.

### The AegisPay Core Thesis
AegisPay eliminates counterparty deadlock through an authoritative architectural separation:

$$\text{\bf AI advises} \quad \longrightarrow \quad \text{\bf Deterministic security policies authorize} \quad \longrightarrow \quad \text{\bf PayPal executes}$$

By running isolated AI evaluation as an **unprivileged advisory step**, AegisPay ensures that large language models never hold financial authority, while clients and contractors benefit from instant, automated disbursements for verified work.

---

## 2. Architecture Highlights: The 6-Tier Pipeline

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              AEGISPAY SETTLEMENT ENGINE                                │
└────────────────────────────────────────────────────────────────────────────────────────┘
   [ Contractor Pull Request ]
                │
                ▼
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │ TIER 1: Immutable Deliverable Evidence                                       │
   │ • SHA-256 Git Commit SHA binding (Nullifies TOCTOU Branch Mutation Attacks) │
   │ • Acceptance Criteria SOW Hash (Normalized & Salted SHA-256)                 │
   │ • Deterministic CI Assertion Log Digest                                      │
   └──────────────────────────────────────┬───────────────────────────────────────┘
                                          │
                                          ▼
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │ TIER 2: Isolated Two-Pass AI Evaluator (GPT-4o-mini / Offline Mock)          │
   │ • PASS 1: Content boundary scan & prompt-injection neutralization            │
   │ • PASS 2: Rigid JSON-schema acceptance criteria evaluation                   │
   │ • Zero financial authority: No PayPal tokens, no write permissions          │
   └──────────────────────────────────────┬───────────────────────────────────────┘
                                          │
                                          ▼
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │ TIER 3: Deterministic Policy Firewall (Mathematical Safety Invariants)       │
   │ • Blast-Radius Spending Cap (Autonomous <= $200.00; > $200 -> Sign-Off)      │
   │ • Hard assertion gates: 100% CI assertions + zero security anomalies         │
   │ • Challenge Cooling Window (15s demo cooling to register counter-disputes)   │
   └──────────────────────────────────────┬───────────────────────────────────────┘
                                          │
                                          ▼
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │ TIER 4: Idempotent PayPal Settlement & Webhook Telemetry                     │
   │ • Deterministic SenderBatchId: SHA256(contractId : milestoneId : releaseOp)  │
   │ • PayPal Payouts REST API v1 (/v1/payments/payouts)                          │
   │ • Resilient UNKNOWN state timeout handling (Zero duplicate payout leaks)     │
   │ • Asynchronous webhook ingestion (/api/paypal/webhook)                       │
   └──────────────────────────────────────┬───────────────────────────────────────┘
                                          │
                                          ▼
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │ TIER 5: AG Grid Financial Ledger & Portfolio Intelligence                    │
   │ • Dark-themed financial cockpit (ag-theme-alpine-dark)                       │
   │ • Real-time Capital Allocation breakdown bar                                 │
   │ • 5-way interactive category cross-filtering with dynamic pinned footers     │
   │ • Cell flashing transitions & 1-click CSV ledger export                      │
   └──────────────────────────────────────┬───────────────────────────────────────┘
                                          │
                                          ▼
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │ TIER 6: Verified Settlement Certificate                                      │
   │ • Cryptographic audit certificate modal linking Commit SHA to PayPal Batch   │
   │ • Print-ready institutional layout (@media print) for 1-click PDF download   │
   │ • Attested SHA-256 digital signature seal                                    │
   └──────────────────────────────────────────────────────────────────────────────┘
```

* **Tier 1 — Immutable Deliverable Evidence:** Binds evaluated pull requests to explicit Git commit SHAs, SOW specification hashes, and CI output digests. Eliminates Time-of-Check to Time-of-Use (TOCTOU) branch manipulation.
* **Tier 2 — Isolated Two-Pass AI Evaluator:** Runs strictly read-only with zero payment credentials. Pass 1 sanitizes input diffs against prompt-injection signatures; Pass 2 audits compliance against acceptance criteria.
* **Tier 3 — Deterministic Policy Firewall:** Enforces an autonomous spending blast-radius cap ($\le \$200.00$), routes high-value contracts to client sign-off, and enforces dispute cooling windows.
* **Tier 4 — Idempotent PayPal Settlement:** Generates stable SHA-256 batch IDs. If an HTTP timeout occurs, the transaction transitions to `UNKNOWN` for reconciliation rather than blindly retrying and double-paying.
* **Tier 5 — AG Grid Financial Ledger:** Institutional dashboard featuring live pinned summary footers, global quick search, category cross-filtering, and CSV export.
* **Tier 6 — Verified Settlement Certificate:** Institutional cryptographic certificate linking code commits, evaluator confidence, and PayPal batch IDs into a printable A4/PDF document.

---

## 3. Interactive 1-Click Demo Scenarios

The dashboard features 3 pre-configured scenarios demonstrating the system's policy guardrails:

| Scenario | Target Milestone | Contract Amount | Scenario Profile | Expected Engine State |
| :--- | :--- | :--- | :--- | :--- |
| **Scenario A: Autonomous Fast-Track** | `ms-101` | **$150.00** | Clean OAuth2 implementation, 14/14 unit tests pass | High confidence $\rightarrow$ 15s cooling window $\rightarrow$ Auto-disburse via PayPal |
| **Scenario B: High-Value Human Sign-Off** | `ms-102` | **$450.00** | Reentrancy-guarded smart contract, gas benchmarks verified | Exceeds $200 blast cap $\rightarrow$ Held safely for Client 1-Click Authorization |
| **Scenario C: Prompt Injection Defense** | `ms-103` | **$80.00** | Malicious backdoor diff attempting system override | Hostile payload neutralized $\rightarrow$ Rejected by Policy Firewall |

---

## 4. Zero-Config Quick Start (Running in 30 Seconds)

AegisPay is designed for immediate evaluation. **Zero external API keys are required** to test all three scenarios, the cooling window, PayPal payout flows, and certificate generation:

### Option A: Local Node.js Execution

```bash
# 1. Clone repository
git clone https://github.com/milanm/aegispay.git
cd aegispay

# 2. Install dependencies
npm install

# 3. Copy environment template (works out of the box with zero credentials!)
cp .env.example .env.local

# 4. Launch development server
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### Option B: Docker Compose (Host-Isolated)

```bash
# Build and run containerized service
docker compose up --build
```

Access the application at **[http://localhost:3000](http://localhost:3000)**.

---

## 5. Sponsor Technology Deep-Dive

### PayPal Developer Platform
* **PayPal Payouts REST API v1 (`/v1/payments/payouts`):** Batch payout orchestration with single-transaction settlement reconciliation.
* **Deterministic Idempotency Key:** Payout requests use `sender_batch_header.sender_batch_id` formatted as `aegis-v1-${SHA256(contractId:milestoneId:releaseId)}`. Prevents duplicate payout disbursements during network drops.
* **Asynchronous Webhook Ingestion (`/api/paypal/webhook`):** Ingests and correlates PayPal webhook events (`PAYMENT.PAYOUTSBATCH.SUCCESS`, `PAYMENT.PAYOUTS-ITEM.SUCCEEDED`, etc.) into an append-only audit stream.
* **High-Fidelity Sandbox Simulator:** When sandbox credentials are not configured in `.env.local`, AegisPay automatically runs an authentic sandbox mock mode so evaluators can test complete lifecycles out of the box.

### AG Grid Enterprise Financial Cockpit
* **Custom Dark Theme (`ag-theme-alpine-dark`):** Professional high-contrast layout tuned for enterprise financial operations.
* **Pinned Bottom Financial Totals:** Real-time summary row computing dynamic totals (total vaulted capital, verification percentage, and settled volume).
* **Portfolio Intelligence Cross-Filtering:** Interactive capital allocation bar and category cards (`All`, `Verified`, `Sign-Off`, `Disbursed`, `Safeguards`) that cross-filter the AG Grid ledger in real time.
* **Cell Flashing Animations:** Uses `enableCellChangeFlash: true` to visually pulse cells when policy or settlement statuses transition.
* **CSV Ledger Export:** Generates authoritative CSV ledger exports via `gridApi.exportDataAsCsv()`.

---

## 6. Health Probe & System Status

Check the health status of all subsystems:

```bash
curl -s http://localhost:3000/api/health | jq .
```

Response payload:
```json
{
  "status": "healthy",
  "timestamp": "2026-10-31T09:15:00.000Z",
  "environment": "sandbox",
  "components": {
    "policyEngine": "operational",
    "aiEvaluator": "offline_fallback_ready",
    "paypalClient": "mock_sandbox_ready",
    "agGridLedger": "operational"
  },
  "zeroConfigDemo": true,
  "version": "1.0.0"
}
```

---

## 7. Architecture & Deep-Dive Technical Documentation

For an exhaustive technical breakdown of security invariants, TOCTOU protection, and state transition matrices, consult **[ARCHITECTURE.md](ARCHITECTURE.md)**.

---

## 8. License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
