# SANKALP — Monorepo Feature Catalog Across All 4 Personas
**Smart Agreements and Network for Key Achievements, Ledgers and Payments**  
*Tagline: "Bridging Work and Trust"*

---

## 📍 File Location
This document is located in the root of the repository:
📄 [`features.md`](file:///c:/Users/dhruv/Downloads/ThandaPaani_college_round-integration-merge-all/ThandaPaani_college_round-integration-merge-all/features.md)

---

## 🏛️ Monorepo Overview

SANKALP is divided into 4 specialized components, each developed by a dedicated person, unified by strict schema seams and zero-loss financial invariants:

```
├── PERSON1 YASH NAIK/      -> Smart Contracts & EVM Protocol (Hardhat / Solidity)
├── PERSON2 DHRUV/          -> Backend REST API, SIWE Auth & DB (Express / TypeScript / Prisma)
├── PERSON3 YASHDEEP/       -> Advisory AI Engine & Code Analyzer (FastAPI / Python)
├── PERSON4 SUZAN/          -> SANKALP Frontend & Web3 UI (React / Vite / Tailwind / Ethers v6)
```

---

## 👤 PERSON 1: YASH NAIK — Smart Contracts & EVM Protocol

**Directory**: `PERSON1 YASH NAIK/contracts/`  
**Core Contract**: `FairWork.sol` (Solidity `^0.8.28`)  
**Network Targets**: Hardhat Local (`31337`), Polygon Amoy Testnet (`80002`)

### Features Implemented:
1. **Deterministic Non-Custodial Escrow**:
   - Supports both `MILESTONE` mode (staged releases) and `LUMP_SUM` mode.
   - Payouts are executed strictly via the Checks-Effects-Interactions (CEI) pattern with non-reentrancy guards.
2. **Conservation of Accounting Invariant**:
   - Strictly enforces: $\text{locked} + \text{released} + \text{disputed} + \text{refunded} + \text{feesPaid} \equiv \text{totalFunded}$.
3. **Decentralized 3-Arbitrator Dispute Resolution**:
   - Arbitrator council pool where 3 peers cast independent votes ($0 - 10000$ bps).
   - Smart contract resolves disputes via the **median of votes**, preventing extreme outlier bribes.
   - Fallback mechanism invokes the on-chain recorded advisory AI progress score if $< 2$ votes are cast before deadline.
4. **Silence Auto-Approval Window Timer**:
   - If a client is inactive beyond `reviewWindowDays`, the freelancer can invoke `claimReviewTimeout()` to auto-release milestone funds without client action.
5. **Daily Basis Point Late Penalty Deduction**:
   - Automatically deducts a daily penalty (`latePenaltyBpsPerDay` up to `maxLatePenaltyBps`) from late submissions, refunding the penalty back to the client while paying the net balance to the freelancer.
6. **Grace Window Reclaim**:
   - Clients can reclaim unsubmitted milestone funds once the deadline plus `graceDays` has elapsed.
7. **Mutual Amendment Workflow**:
   - Either party can propose on-chain contract amendments; counterparties accept or reject before new terms take effect.

---

## 👤 PERSON 2: DHRUV — Backend REST API, SIWE Auth & Database

**Directory**: `PERSON2 DHRUV/backend/`  
**Stack**: Express.js, TypeScript, Prisma ORM, SQLite / PostgreSQL, TSX

### Features Implemented:
1. **Sign-In with Ethereum (SIWE) Cryptographic Auth**:
   - `POST /api/auth/nonce`: Issues cryptographically random single-use nonces per wallet address.
   - `POST /api/auth/verify`: Verifies EIP-191 personal signatures (`FairWork login: <nonce>`) and issues stateless Bearer JWTs.
2. **Off-Chain Collaboration & Community Feed**:
   - `GET /api/posts` & `POST /api/posts`: Public marketplace for Job and Service requests with skill tagging.
   - `GET /api/posts/:id/proposals` & `POST /api/posts/:id/proposals`: Freelancers submit price proposals and cover letters.
3. **Real-time Consultation Chat Threads**:
   - `POST /api/threads`: Opens direct consultation channels linked to job posts.
   - `GET /api/threads/:id/messages` & `POST /api/threads/:id/messages`: Full message ledger history between client and freelancer.
4. **Agreement Lifecycle & Timeline Audit Ledger**:
   - `GET /api/agreements`, `POST /api/agreements`, `PUT /api/agreements/:id/terms`: CRUD for draft terms with automatic approval resets upon edits.
   - Immutable audit trail (`/api/agreements/:id/timeline`) recording every lifecycle event.
5. **Background Deadline Watcher Service**:
   - Cron service running every 60 seconds (`src/modules/deadlines/watcher.ts`) monitoring approaching review windows, expired deadlines, and auto-populating `/api/alerts`.

---

## 👤 PERSON 3: YASHDEEP — Advisory AI Engine & Code Analyzer

**Directory**: `PERSON3 YASHDEEP/`  
**Stack**: Python 3.12, FastAPI, Pydantic v2, Pytest

### Features Implemented:
1. **Advisory Natural Language Agreement Synthesizer**:
   - `POST /agreements/draft`: Parses chat logs into structured `AgreementTerms` JSON.
   - Extracts milestone titles, deliverables, acceptance criteria, currency, review windows, and late penalties.
   - Flags open ambiguities and risk warnings (e.g. missing IP assignment, high penalty rates).
2. **GitHub Deliverable AST & Commit Inspector**:
   - `POST /milestones/verify`: Examines Git commit SHAs, PR diffs, AST function complexity, and test runner outputs.
   - Computes an advisory deliverable progress score ($0 - 10000$ bps) backed by evidence.
3. **Dispute Evidence Synthesizer**:
   - `POST /disputes/summary`: Parses contradictory claims and evidence logs into structured dispute summaries for the 3 arbitrators.
4. **Prompt Injection & Security Defenses**:
   - Semantic regex and token filters preventing prompt injection attacks.
   - Pydantic schema validation with automatic JSON repair for truncated tokens.
5. **Strict Advisory Boundary**:
   - AI outputs are purely informational; it holds no private keys and cannot move funds.

---

## 👤 PERSON 4: SUZAN — SANKALP Frontend & Web3 UX

**Directory**: `PERSON4 SUZAN/`  
**Stack**: React 18, Vite, Tailwind CSS, Ethers.js v6, Lucide Icons, Vitest

### Features Implemented:
1. **SANKALP Calm Fintech SaaS Design System**:
   - Premium palette: Ivory (`#F8F8F0`), Sage (`#E7EFE3`), Forest Green (`#263F32`), Coral Accent (`#F28F7B`), Ink (`#111713`).
   - Space Grotesk (headings), Inter (body), IBM Plex Mono (hashes, addresses, hex data).
   - Reusable UI kit (`PERSON4 SUZAN/src/components/ui/`): Button, Card, Badge, Modal, AmountDisplay, CountdownTimer, ProgressBar, etc.
2. **Non-Custodial Web3 Wallet Integration**:
   - Native MetaMask connection with instant Pre-funded Demo Personas for Localhost/Hardhat.
   - Automatic signature verification and SIWE session persistence in localStorage.
3. **Verifiable Legal Contract Certificate & PDF Exporter**:
   - `ExportContractModal.jsx`: Printable legal agreement document with Keccak-256 seal, IPFS CID, milestone deliverables schedule, and `window.print()` / PDF download.
4. **Decentralized IPFS CIDv1 Generator**:
   - `ipfsHelper.js`: Computes deterministic IPFS CIDv1 pointers (`ipfs://bafkrei...`) and gateway URLs for canonical terms.
5. **Soulbound Reputation Tokens (ERC-5192 SBT)**:
   - `ReputationCard.jsx`: Interactive reputation scorecard displaying on-chain verified credentials (*"Verified Escrow Veteran"*, *"100% On-Time Delivery"*, *"Dispute-Free Pioneer"*).
6. **Interactive EVM Network Switcher**:
   - `TopBar.jsx`: 1-click switcher toggling between **Hardhat Localhost (31337)** and **Polygon Amoy (80002)**, with automatic `wallet_addEthereumChain` prompt and Amoy faucet quick link.
7. **GitHub Webhook & Deliverable Commit Explorer**:
   - `GithubDeliverableModal.jsx`: Freelancers can browse recent branch commits or simulate live GitHub webhook events with instant AI scoring.
8. **Multi-Currency Escrow (MATIC, USDC, USDT)**:
   - `DraftPage.jsx`: Multi-currency selector supporting native MATIC and USD stablecoins with real-time INR/USD rate conversion.
9. **Full End-to-End Workflow Pages**:
   - **Landing Page**: 3-step explainer with hero CTA.
   - **Dashboard**: Financial overview (locked, released, disputed, fees paid) with countdown timers.
   - **Community / Projects Feed**: Job & Service posts with interactive proposal submission.
   - **Messages / Chat**: Consultation threads with 1-click AI draft agreement generator.
   - **Draft Review Wizard**: Side-by-side editing, open questions review, and Keccak-256 binding.
   - **Agreement Detail**: 5-tab workspace (Milestones, Payments, Disputes, Amendments, Timeline).
   - **Disputes Council**: Arbitrator voting cards with median share calculator.

---

## 🔑 Demo Accounts Reference (MetaMask & Localhost 8545)

Connect MetaMask to `http://127.0.0.1:8545` (Chain ID `31337`) and import either account:

| Role | Wallet Address | Private Key (Import into MetaMask) | Balance |
| :--- | :--- | :--- | :--- |
| **Client** | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` | ~10,000 ETH |
| **Freelancer** | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` | ~10,000 ETH |
| **Deployer / Admin** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` | ~10,000 ETH |

---

## 🧪 Testing Verification Across All 4 Personas

All tests pass 100% across the monorepo:

```powershell
# 1. Person 1 Contracts Test Suite (12 passing tests)
npm run test:contracts

# 2. Person 3 Advisory AI Engine Test Suite (30 passing tests)
npm run test:ai

# 3. Person 4 Frontend Vitest Suite (11 passing tests)
npm run test:frontend

# 4. Cross-Persona Schema Seam Validator (Person 1 + 2 + 3 + 4)
npm run test:seams

# 5. Person 4 Frontend Production Bundle Verification
npm --prefix "PERSON4 SUZAN" run build
```
