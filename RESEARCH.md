# SANKALP — Comprehensive Research & Architectural Whitepaper
**Smart Agreements and Network for Key Achievements, Ledgers and Payments**  
*Tagline: "Bridging Work and Trust"*

---

## 📑 Table of Contents
1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [Market Analysis & Competitive Landscape](#2-market-analysis--competitive-landscape)
3. [System Architecture & Cross-Persona Design](#3-system-architecture--cross-persona-design)
4. [Cryptographic Specifications & Data Seams](#4-cryptographic-specifications--data-seams)
5. [Smart Contract Security & Economic Invariants](#5-smart-contract-security--economic-invariants)
6. [Advisory AI Engine & Verification Heuristics](#6-advisory-ai-engine--verification-heuristics)
7. [Frontend Design System & UX Principles](#7-frontend-design-system--ux-principles)
8. [Benchmarking & Verification Results](#8-benchmarking--verification-results)
9. [Future Roadmap & Advanced Research Vectors](#9-future-roadmap--advanced-research-vectors)

---

## 1. Executive Summary & Problem Statement

### 1.1 The Freelance Trust Paradox
Global freelance marketplaces facilitate over $1.5 trillion in transactions annually, yet they operate on an inherently adversarial trust model:
1. **High Intermediary Rents**: Traditional Web2 platforms (Upwork, Fiverr, Toptal) charge 10% to 20% platform fees on both clients and freelancers.
2. **Custodial Fragility & Arbitrary Freezes**: Funds are held in centralized corporate accounts. Accounts and pending payments can be frozen unilaterally with minimal transparency.
3. **Subjective & Slow Dispute Resolution**: Dispute support agents lack technical context (AST code changes, unit test results, pull request diffs), often resulting in arbitrary refunds or developer penalties.
4. **Disjointed Agreement Lifecycle**: Project scoping happens in chat apps (Slack, Telegram), code deliverables live on GitHub, payments occur on PayPal/Stripe, and arbitration is handled through manual support tickets.

### 1.2 The SANKALP Solution
SANKALP unifies the entire freelance lifecycle into an open, deterministic, and non-custodial framework:
- **Natural Language to Smart Agreement**: Advisory AI converts unconstrained community chat into canonical `AgreementTerms` JSON bound by a deterministic **Keccak-256** hash.
- **Non-Custodial Milestone Escrow**: Funds lock directly into an EVM smart contract on Polygon/Ethereum. Platform administrators have **zero custody** over deposited capital.
- **Advisory Code Verification**: The AI inspection engine examines Git commit SHAs, AST changes, and test suite outcomes to provide verifiable evidence, retaining final authority in client hands.
- **Median-Share Decentralized Arbitration**: Disputed milestones are resolved by a 3-arbitrator peer pool using median vote calculations to mathematically neutralize bribery or outlier votes.

---

## 2. Market Analysis & Competitive Landscape

| Feature / Dimension | Web2 Platforms (Upwork/Fiverr) | Web3 Escrows (Kleros/EscrowDAO) | SANKALP Platform |
| :--- | :--- | :--- | :--- |
| **Custody of Funds** | Centralized Corporate Escrow | Non-Custodial Smart Contract | **Non-Custodial Smart Contract** |
| **Platform Take Rate** | 10% – 20% + processing fees | 2% – 5% | **0.5% – 1% (Gas-efficient protocol)** |
| **Agreement Scoping** | Manual text contracts | Manual hex calldata / raw JSON | **Advisory AI Canonical Synthesis** |
| **Code Deliverable Verification** | Manual client inspection | None / User submitted links | **Automated GitHub & AST Analysis** |
| **Dispute Mechanism** | Platform customer support | Anonymous token-staked jurors | **3-Peer Arbitrator Pool + AI Median** |
| **Reputation System** | Closed platform star ratings | None or external wallets | **ERC-5192 Soulbound Tokens (SBT)** |
| **Cryptographic Proof** | Database row ID | Transaction Hash | **Keccak-256 + IPFS CIDv1 Certificate** |

---

## 3. System Architecture & Cross-Persona Design

The SANKALP monorepo is engineered as four loosely coupled microservices adhering to strict interface boundaries:

```
+---------------------------------------------------------------------------------------+
|                                    SANKALP PLATFORM                                   |
+---------------------------------------------------------------------------------------+
|                                                                                       |
|   +-----------------------+                    +----------------------------------+   |
|   |   PERSON 4: FRONTEND  |                    |      PERSON 2: BACKEND API       |   |
|   |   (React 18 + Vite)   |                    |    (Express + TypeScript + Prisma) | |
|   |                       |                    |                                  |   |
|   | - SANKALP Fintech UI  |  REST / Auth JWT   | - SIWE Auth & Session Mgmt       |   |
|   | - Web3 Direct Wallet  |<------------------>| - Community Posts & Proposals    |   |
|   | - Legal PDF Exporter  |                    | - Threads & Timeline Ledger      |   |
|   | - IPFS & SBT Cards    |                    | - Deadline Watcher Cron          |   |
|   +-----------+-----------+                    +-----------------+----------------+   |
|               |                                                  |                    |
|               | Web3 RPC Signing                                 | HTTP / Proxy       |
|               v                                                  v                    |
|   +-----------------------+                    +----------------------------------+   |
|   |   PERSON 1: CONTRACTS |                    |      PERSON 3: AI ENGINE         |   |
|   |   (Solidity 0.8.28)   |                    |       (Python FastAPI)           |   |
|   |                       |                    |                                  |   |
|   | - FairWork.sol Escrow |                    | - Canonical Agreement Generator  |   |
|   | - 3-Arbitrator Median |                    | - GitHub AST & PR Inspector      |   |
|   | - Late Penalty Math   |                    | - Evidence Dispute Summarizer    |   |
|   | - Review Auto-Claim   |                    | - Prompt Injection Defense       |   |
|   +-----------------------+                    +----------------------------------+   |
|                                                                                       |
+---------------------------------------------------------------------------------------+
```

### 3.1 Person 1: Smart Contracts (`PERSON1 YASH NAIK/contracts`)
- **Core Contract**: `FairWork.sol` (EVM, Solidity `^0.8.28`).
- **Core Responsibilities**:
  - State machine management: `Draft` -> `AwaitingFunding` -> `Active` -> `Disputed` / `Completed` / `Cancelled`.
  - Non-custodial locking and automated payouts for milestone and lump-sum agreements.
  - Review window auto-approval timer: If a client remains inactive beyond `reviewWindowDays`, the freelancer can invoke `claimReviewTimeout()` to auto-release funds.
  - Basis point late delivery penalty calculator (`latePenaltyBpsPerDay`, capped at `maxLatePenaltyBps`).
  - 3-arbitrator dispute resolution with median share calculation.

### 3.2 Person 2: Backend REST API (`PERSON2 DHRUV/backend`)
- **Technology Stack**: Node.js, Express, TypeScript, Prisma ORM, SQLite/PostgreSQL.
- **Core Responsibilities**:
  - Cryptographic Sign-In with Ethereum (SIWE): Issues nonces via `/api/auth/nonce` and verifies EIP-191 signatures via `/api/auth/verify`.
  - Off-chain collaboration hub: Posts, proposals, and direct chat threads.
  - Milestone deliverable metadata store and immutable timeline audit log.
  - Deadline Watcher background cron service running every 60 seconds to detect approaching review windows and expired deadlines.

### 3.3 Person 3: Advisory AI Engine (`PERSON3 YASHDEEP`)
- **Technology Stack**: Python 3.12, FastAPI, Pydantic v2, AST parsers, Pytest.
- **Core Responsibilities**:
  - `POST /agreements/draft`: Synthesizes unstructured negotiation into structured `AgreementTerms` JSON, identifying missing acceptance criteria, ambiguities, and risk factors.
  - `POST /milestones/verify`: Evaluates GitHub commits, PR diffs, AST changes, and test suite execution to output an advisory progress score (0 to 10,000 basis points).
  - `POST /disputes/summary`: Parses contradictory claims and evidence logs into structured dispute summaries for the 3-arbitrator panel.
  - Strict advisory boundary: AI outputs are purely informational; the smart contract and user private keys retain final financial authority.

### 3.4 Person 4: Frontend Web3 UI (`PERSON4 SUZAN`)
- **Technology Stack**: React 18, Vite, Tailwind CSS, Ethers.js v6, Lucide Icons, Vitest.
- **Core Responsibilities**:
  - Premium calm fintech UI using SANKALP design tokens (Ivory `#F8F8F0`, Sage `#E7EFE3`, Forest Green `#263F32`, Coral `#F28F7B`, Ink `#111713`).
  - Direct wallet transaction execution (MetaMask, Coinbase Wallet) on Localhost and Polygon Amoy.
  - Printable legal contract certificates and JSON data downloads.
  - Verifiable IPFS CIDv1 generation and ERC-5192 Soulbound Reputation Token visualization.

---

## 4. Cryptographic Specifications & Data Seams

### 4.1 Canonical Agreement Normalization & Hashing
To ensure identical Keccak-256 terms hashes across JavaScript, TypeScript, Python, and Solidity, SANKALP enforces deterministic canonical sorting:

```typescript
// Deterministic Canonical Hash Algorithm
function computeCanonicalHash(terms: AgreementTerms): string {
  const normalized = {
    schemaVersion: terms.schemaVersion,
    title: terms.title.trim(),
    description: terms.description.trim(),
    client: terms.client.toLowerCase(),
    freelancer: terms.freelancer.toLowerCase(),
    currency: terms.currency.toUpperCase(),
    totalAmount: terms.totalAmount,
    paymentMode: terms.paymentMode,
    latePenaltyBpsPerDay: terms.latePenaltyBpsPerDay,
    maxLatePenaltyBps: terms.maxLatePenaltyBps,
    reviewWindowDays: terms.reviewWindowDays,
    graceDays: terms.graceDays,
    maxRevisions: terms.maxRevisions,
    github: {
      repoUrl: terms.github.repoUrl.trim().toLowerCase(),
      branch: terms.github.branch.trim()
    },
    milestones: terms.milestones.map((m, idx) => ({
      index: idx,
      title: m.title.trim(),
      description: m.description.trim(),
      amount: m.amount,
      deadline: m.deadline,
      requiredProgressBps: m.requiredProgressBps,
      acceptanceCriteria: [...m.acceptanceCriteria].sort()
    }))
  };

  const canonicalJson = JSON.stringify(normalized, Object.keys(normalized).sort());
  return keccak256(toUtf8Bytes(canonicalJson));
}
```

### 4.2 Cross-Language Seam Validation (Seam 2.3)
Our cross-persona validation test (`scripts/test-schema-agreement.mjs`) verifies that:
1. Valid agreements produce **identical** hashes across Ethers.js v6 (Frontend), `ethers` in Node (Backend), and `web3.py`/`hashlib` (Python AI).
2. Malformed agreements (invalid enums, negative penalty bps, empty milestones) are rejected with identical error classifications across all three layers.

---

## 5. Smart Contract Security & Economic Invariants

### 5.1 Conservation of Value Invariant
Every transaction in `FairWork.sol` strictly enforces the accounting invariant:
$$\text{lockedFunds} + \text{releasedFunds} + \text{disputedFunds} + \text{refundedFunds} + \text{feesPaid} \equiv \text{totalFunded}$$

This guarantees that:
- No funds can be created or destroyed within the contract.
- Re-entrancy attacks cannot drain secondary milestone deposits.
- In the event of a dispute, disputed funds are segregated and cannot be touched by milestone releases.

### 5.2 3-Arbitrator Median Share Mathematics
When a dispute is escalated to the peer arbitration council:
1. Three arbitrators independently cast a vote $v_1, v_2, v_3 \in [0, 10000]$ basis points representing the freelancer's payout share.
2. The contract calculates the median vote:
   $$\text{resolvedShare} = \text{median}(v_1, v_2, v_3)$$
3. **Sybil & Outlier Resistance**: If one rogue or compromised arbitrator votes $0\%$ or $100\%$, the median guarantees the decision is bound by the moderate consensus of the remaining two arbitrators.
4. **Fallback Mechanism**: If fewer than 2 arbitrators cast votes before the arbitration deadline, the contract falls back to the advisory AI progress score recorded on-chain.

---

## 6. Advisory AI Engine & Verification Heuristics

### 6.1 GitHub Deliverable Inspection Model
The advisory verification service inspects deliverables across four dimensions:
1. **Commit Lineage**: Validates that the submitted commit SHA exists on the specified repository branch and is signed.
2. **AST Complexity & Code Churn**: Compares additions, deletions, and AST function signatures against the milestones' acceptance criteria keywords.
3. **Automated Test Run Extraction**: Parses CI/CD test reports (JUnit, Vitest, Pytest output) to verify passing assertions.
4. **Advisory Scoring Formula**:
   $$\text{Score} = w_{\text{git}} \cdot S_{\text{commit}} + w_{\text{ast}} \cdot S_{\text{ast}} + w_{\text{tests}} \cdot S_{\text{tests}}$$
   The resulting basis points ($0 - 10000$) are written to the database and signed as advisory recommendations.

### 6.2 Prompt Injection & Security Defenses
To prevent adversarial prompt injection in user consultation chats (e.g. attempting to force the AI to draft terms with 0% penalties or malicious client addresses):
- Inputs are passed through regex and semantic safety filters.
- Outputs are strictly validated against Pydantic schemas with auto-repair fallbacks for truncated JSON tokens.

---

## 7. Frontend Design System & UX Principles

### 7.1 Fintech Aesthetics & Color Tokens
Unlike conventional crypto dashboards that use neon greens and dark gaming palettes, SANKALP follows a **calm, premium fintech design system**:
- **Ivory (`#F8F8F0`)**: Warm canvas background reducing optical fatigue.
- **Sage (`#E7EFE3`)**: Soft neutral for containers, sidebars, and active tabs.
- **Forest Green (`#263F32`)**: Confident, grounded primary color for headers, buttons, and verified states.
- **Coral (`#F28F7B`)**: Vibrant, warm accent for primary calls-to-action and warning badges.
- **Ink (`#111713`)**: High-contrast, legible typography color.

### 7.2 Typography & Component Library
- **Typography**: Space Grotesk (headings and display labels), Inter (body and data tables), IBM Plex Mono (hashes, addresses, and hex data).
- **Reusable UI Library**: Located in `PERSON4 SUZAN/src/components/ui/` featuring `Button`, `Card`, `Badge`, `Modal`, `AddressChip`, `AmountDisplay`, `CountdownTimer`, `ProgressBar`, and `TxStatus`.

---

## 8. Benchmarking & Verification Results

### 8.1 Test Suite Summary

```
================================================================================
VERIFICATION SUITE RUNNER — ALL COMPONENTS PASS
================================================================================
1. Smart Contracts (Hardhat / Chai)  : 12 / 12 PASS (100%) [2.1s]
2. AI Advisory Service (Pytest)     : 30 / 30 PASS (100%) [0.28s]
3. Frontend Unit Tests (Vitest)      : 11 / 11 PASS (100%) [1.17s]
4. Schema Seam Validation (Node/TS)  :  3 /  3 PASS (100%) [0.45s]
--------------------------------------------------------------------------------
TOTAL SUITES                         :  4 /  4 PASS (100%)
TOTAL UNIT & INTEGRATION TESTS       : 56 / 56 PASS (100%)
VITE PRODUCTION BUNDLE               : 0 ERRORS (1810 modules transformed)
================================================================================
```

### 8.2 Live Microservices Health Probes
- Hardhat Node (`http://127.0.0.1:8545`): **Active (Chain ID 31337)**
- Python AI Engine (`http://127.0.0.1:8000/health`): **`status: ok`, version `1.0.0`**
- Express Backend API (`http://127.0.0.1:4000/health`): **`status: ok`, uptime active**
- Frontend Vite Server (`http://localhost:5173`): **HTTP 200 OK, HMR active**

---

## 9. Future Roadmap & Advanced Research Vectors

### 9.1 Account Abstraction (ERC-4337 & Social Logins)
- Implement ERC-4337 Smart Contract Accounts to allow non-crypto native clients to fund escrows via credit cards using Paymasters, abstracting gas fees.

### 9.2 Zero-Knowledge Deliverable Proofs (zk-SNARKs)
- Utilize zero-knowledge proofs to allow developers working on proprietary intellectual property to prove their code compiles and passes private unit test suites without disclosing source code to the client before payment release.

### 9.3 Superfluid Continuous Escrow Streaming
- Supplement milestone-based payments with real-time per-second money streaming for continuous hourly retainers and consulting engagements.
