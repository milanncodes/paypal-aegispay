# AegisPay — Intelligent Freelance Escrow & Verified Contractor Payouts

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg?logo=next.js)](https://nextjs.org/)
[![AG Grid](https://img.shields.io/badge/AG_Grid-Enterprise--Ready_v32-blue.svg?logo=aggrid)](https://www.ag-grid.com/)
[![PayPal Payouts](https://img.shields.io/badge/PayPal-REST_Payouts_v1-003087.svg?logo=paypal)](https://developer.paypal.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)

> **Bridging autonomous code verification with defensive PayPal Payouts and AG Grid financial intelligence.**

---

## 1. Problem Statement & Value Proposition

In the global software contracting economy, two opposing frictions paralyze milestone settlement:
* **Contractor Friction:** Independent engineers and agencies often wait **14 to 30 days** for manual client reviews, PR approvals, and accounting wire disbursements.
* **Client Friction:** Project founders and enterprises risk disbursing escrow funds for deliverables containing broken tests, unverified specifications, or hidden security vulnerabilities.

### The AegisPay Solution
AegisPay eliminates counterparty deadlock through an authoritative architectural separation:

$$\text{\bf AI advises} \quad \longrightarrow \quad \text{\bf Deterministic security policies authorize} \quad \longrightarrow \quad \text{\bf PayPal executes}$$

By running isolated AI evaluation as an **unprivileged advisory step**, AegisPay ensures that large language models never hold financial authority, while clients and contractors benefit from instant, automated disbursements for verified work.

---

## 2. Defensive Architecture: The Quad-Tier Security Firewall

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             AEGISPAY FIREWALL PIPELINE                           │
└──────────────────────────────────────────────────────────────────────────────────┘
   [ Contractor PR ]
          │
          ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ TIER 1: Immutable Evidence Snap                                        │
   │ • SHA-256 Git Commit SHA binding (Nullifies TOCTOU Attacks)           │
   │ • Acceptance Criteria SOW Hash (Normalized & Salted)                   │
   │ • Deterministic CI Assertion Log Digest                                │
   └──────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ TIER 2: Isolated Two-Pass AI Auditor (GPT-4o-mini / Fallback)          │
   │ • PASS 1: Content boundary scan & prompt-injection neutralization      │
   │ • PASS 2: Rigid JSON-schema acceptance criteria evaluation             │
   │ • Zero financial authority: No PayPal tokens, no write permissions    │
   └──────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ TIER 3: Deterministic Policy Engine (Invariant Enforcement)            │
   │ • Blast-Radius Spending Cap (Autonomous <= $200.00; > $200 -> Sign-Off)│
   │ • Hard assertion gates: 100% CI assertions + zero security anomalies   │
   │ • Challenge Cooling Window (15s demo cooling to register disputes)     │
   └──────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ TIER 4: Idempotent PayPal Settlement & Webhook Telemetry               │
   │ • Deterministic SenderBatchId: SHA256(contractId : milestoneId : opId) │
   │ • Payouts REST API v1 (/v1/payments/payouts)                           │
   │ • Resilient UNKNOWN state timeout handling (Zero duplicate payouts)   │
   │ • Webhook ingestion & append-only telemetry timeline ledger            │
   └────────────────────────────────────────────────────────────────────────┘
```

1. **Tier 1 — Immutable Evidence Snap:** When a pull request is submitted, the system captures the Git Commit SHA, repository URL, and CI test output hashes. Even if a contractor force-pushes or mutates the branch, the milestone is strictly bound to the evaluated commit.
2. **Tier 2 — Isolated Two-Pass AI Auditor:** The evaluator runs in an isolated context with **zero access to payment credentials**. Pass 1 strips adversarial prompt-injection cues (e.g. `IGNORE ALL PREVIOUS INSTRUCTIONS`), while Pass 2 assesses compliance strictly against acceptance criteria.
3. **Tier 3 — Deterministic Policy Engine:** Mathematical rules govern release authority:
   * **Autonomous Fast-Track:** Score $\ge 90\%$, 100% test assertions pass, and milestone amount $\le \$200.00$.
   * **Human Sign-Off Gate:** Deliverables exceeding the blast-radius cap ($> \$200.00$) require 1-click client sign-off.
   * **Challenge Cooling Window:** Unlocks an active dispute window before disbursement can execute.
4. **Tier 4 — Idempotent PayPal Settlement:** Payouts use deterministic batch keys (`aegis-v1-${hash}`). Retrying the same transaction across network hiccups is strictly idempotent.

---

## 3. Live Interactive Demo Scenarios

The AegisPay dashboard includes 3 pre-configured scenarios demonstrating the system's policy guardrails:

| Scenario | Milestone | Amount | Deliverable Profile | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **Scenario A: Autonomous Fast-Track** | `ms-101` | **$150.00** | Clean OAuth2 implementation, 14/14 unit tests pass | High confidence $\rightarrow$ 15s cooling window $\rightarrow$ Auto-disburse via PayPal |
| **Scenario B: High-Value Human Sign-Off** | `ms-102` | **$450.00** | Reentrancy-guarded smart contract, 100% gas benchmarks passed | Exceeds $200 blast cap $\rightarrow$ Held safely for Client 1-Click Authorization |
| **Scenario C: Prompt Injection Defense** | `ms-103` | **$80.00** | Malicious backdoor diff attempting override prompt injection | Hostile payload neutralized $\rightarrow$ Rejected by Policy Firewall |

---

## 4. Sponsor Technology Deep-Dive

### PayPal Developer Platform Integration
* **PayPal Payouts REST API v1 (`/v1/payments/payouts`):** Asynchronous bulk and single disbursement engine with batch status reconciliation.
* **Deterministic Idempotency:** Derives `sender_batch_header.sender_batch_id` via `SHA-256(contractId:milestoneId:releaseId)`. Guarantees zero duplicate disbursements during transient HTTP timeouts.
* **Timeout Resilience (`UNKNOWN` State Handler):** If the network drops during flight, AegisPay transitions the payout to `UNKNOWN`, initiates reconciliation queries, and prevents blind retries.
* **PayPal Webhook Ingestion (`/api/paypal/webhook`):** Ingests and correlates webhook events (`PAYMENT.PAYOUTSBATCH.SUCCESS`, `PAYMENT.PAYOUTS-ITEM.SUCCEEDED`, etc.) into an append-only telemetry timeline.
* **High-Fidelity Offline Simulator:** If PayPal credentials are not configured, AegisPay automatically runs an authentic sandbox simulator so evaluators can test complete lifecycles out of the box.

### AG Grid Financial Cockpit & Portfolio Intelligence
* **Enterprise Financial Theme:** Tailored dark mode styling (`ag-theme-alpine-dark`) with institutional high-contrast readability.
* **Pinned Summary Footer:** Real-time summary row computing dynamic totals: aggregate vaulted escrow, percentage passed verification, and total settled USD.
* **Portfolio Intelligence & Cross-Filtering:** Interactive capital allocation bar and filter cards (`All`, `Verified`, `Sign-Off`, `Disbursed`, `Safeguards`) that cross-filter the AG Grid ledger in real time.
* **Cell Flashing Animations:** Uses AG Grid's `enableCellChangeFlash: true` to illuminate cells in emerald or amber when settlement statuses transition.
* **Quick Search & 1-Click CSV Export:** Search across commit SHAs, contractor emails, and PayPal batch IDs; export filtered or full ledgers via `gridApi.exportDataAsCsv()`.

### AegisPay Verified Settlement Certificate
* **Print-Ready Audit Record:** When a milestone settles, an official institutional certificate modal is generated containing:
  * Unique Certificate ID (`CERT-MS-XXX-XXXXXXXX`)
  * Immutable Git Commit SHA & SOW Hash
  * AI Confidence Score & Deterministic CI Test Proof
  * PayPal Payout Batch ID & Authorized Timestamp
  * Embedded Cryptographic Seal & print-optimized `@media print` layout for 1-click PDF export.

---

## 5. Quick Start & Local Execution

### Prerequisites
* **Node.js**: v18.17.0+ or v20+
* **npm**: v9+ (or Docker Engine)

### Option 1: Standard Node.js Setup (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/milanm/aegispay.git
cd aegispay

# 2. Install dependencies
npm install

# 3. Configure environment (Works out of the box with zero credentials!)
cp .env.example .env.local

# 4. Start the development server
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### Option 2: Docker Compose (Host-Isolated)

```bash
# Build and run containerized service
docker compose up --build
```

Access the dashboard at **[http://localhost:3000](http://localhost:3000)**.

---

## 6. API Reference & Health Probe

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | System readiness check across Policy Engine, AI Evaluator, and PayPal |
| `GET` | `/api/milestones` | Returns all active contract milestones for AG Grid |
| `POST` | `/api/milestones?action=reset` | Atomically resets store to initial demo state |
| `POST` | `/api/milestones/submit` | Ingests PR diff, runs two-pass evaluator, applies policy gate |
| `POST` | `/api/milestones/release` | Verifies invariants and executes idempotent PayPal payout |
| `POST` | `/api/milestones/halt` | Instant emergency dispute lock and freeze |
| `POST` | `/api/paypal/webhook` | Ingests and correlates PayPal asynchronous telemetry events |

### Verification Probe
Verify the server health endpoint:
```bash
curl -s http://localhost:3000/api/health | jq .
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-10-31T08:45:00.000Z",
  "environment": "sandbox",
  "components": {
    "frontend": "operational",
    "policyEngine": "operational",
    "aiEvaluator": "offline_fallback",
    "paypalClient": "mock_sandbox",
    "agGridLedger": "operational"
  },
  "version": "1.0.0"
}
```

---

## 7. Repository & License Integrity

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
Copyright (c) 2026 AegisPay Contributors
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```
