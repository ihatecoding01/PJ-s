# SANKALP — Complete Project Documentation

**Smart Agreements and Network for Key Achievements, Ledgers and Payments**
*Tagline: "Bridging Work and Trust"*

> A decentralized freelance agreement platform with AI-powered progress tracking, milestone escrow, and median-vote dispute resolution — built as a 4-persona monorepo.

---

## 📑 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Team Structure & Responsibilities](#2-team-structure--responsibilities)
3. [Technology Stack](#3-technology-stack)
4. [Architecture Overview](#4-architecture-overview)
5. [Repository Structure](#5-repository-structure)
6. [Feature Catalogue](#6-feature-catalogue)
   - [6.1 AI Agreement Drafting](#61-ai-agreement-drafting)
   - [6.2 Smart Escrow Payments](#62-smart-escrow-payments)
   - [6.3 Milestone Tracking & Timers](#63-milestone-tracking--timers)
   - [6.4 GitHub Deliverable Verification](#64-github-deliverable-verification)
   - [6.5 3-Arbitrator Dispute Resolution](#65-3-arbitrator-dispute-resolution)
   - [6.6 Soulbound Reputation Badges (ERC-5192)](#66-soulbound-reputation-badges-erc-5192)
   - [6.7 Contract & PDF Export](#67-contract--pdf-export)
   - [6.8 Web3 Wallet Authentication (SIWE)](#68-web3-wallet-authentication-siwe)
   - [6.9 Community Hub & Negotiation](#69-community-hub--negotiation)
   - [6.10 On-Chain Event Timeline & Audit Log](#610-on-chain-event-timeline--audit-log)
   - [6.11 Late Penalty System](#611-late-penalty-system)
   - [6.12 Amendment Proposals](#612-amendment-proposals)
   - [6.13 Role-Based Dashboard](#613-role-based-dashboard)
   - [6.14 Analytics & Performance](#614-analytics--performance)
   - [6.15 Admin Council](#615-admin-council)
   - [6.16 Network Switcher](#616-network-switcher)
   - [6.17 Deadline Watcher Service](#617-deadline-watcher-service)
   - [6.18 Anti-Gaming & Prompt Injection Defense](#618-anti-gaming--prompt-injection-defense)
7. [Smart Contract Deep Dive](#7-smart-contract-deep-dive)
8. [Backend API Reference](#8-backend-api-reference)
9. [AI Engine Endpoints & Services](#9-ai-engine-endpoints--services)
10. [Frontend Pages & Components](#10-frontend-pages--components)
11. [Database Schema (Prisma)](#11-database-schema-prisma)
12. [Cryptographic Specifications](#12-cryptographic-specifications)
13. [Environment Variables & Configuration](#13-environment-variables--configuration)
14. [Setup & Quick Start](#14-setup--quick-start)
15. [Testing Suite](#15-testing-suite)
16. [End-to-End Data Flow](#16-end-to-end-data-flow)
17. [Known Limitations & Design Decisions](#17-known-limitations--design-decisions)
18. [Future Roadmap](#18-future-roadmap)

---

## 1. Project Overview

SANKALP (internally codenamed **FairWork**, team name **ThandaPaani**) is a decentralized freelance agreement platform that unifies the entire freelance lifecycle — from discovery, negotiation, and contract drafting through milestone escrow, AI-assisted code verification, and decentralized dispute resolution — into a single, open, non-custodial framework.

### Core Problem Solved

Traditional freelance platforms (Upwork, Fiverr, Toptal) suffer from:
- **10–20% intermediary fees** on both clients and freelancers
- **Custodial fragility** — funds held in centralized corporate accounts, subject to arbitrary freezes
- **Subjective dispute resolution** — support agents lack technical context (code diffs, test results)
- **Disjointed lifecycle** — scoping in Slack, code on GitHub, payments on PayPal, arbitration via tickets

### SANKALP's Approach

| Dimension | SANKALP Solution |
|:---|:---|
| **Agreement Scoping** | AI converts natural-language chat into canonical `AgreementTerms` JSON |
| **Fund Custody** | Non-custodial EVM smart contract escrow (zero admin access to funds) |
| **Code Verification** | Automated GitHub commit/PR/AST/CI analysis with advisory scoring |
| **Dispute Resolution** | 3-arbitrator peer pool with median vote + AI fallback |
| **Reputation** | ERC-5192 Soulbound Tokens (non-transferable on-chain proof of work) |
| **Platform Fee** | 0.5%–1% (gas-efficient protocol vs 10–20% Web2) |
| **Cryptographic Proof** | Keccak-256 deterministic hashing across JS, TS, Python, and Solidity |

---

## 2. Team Structure & Responsibilities

| Person | Name | Role | Directory |
|:---|:---|:---|:---|
| **Person 1** | Yash Naik | Smart Contracts Lead | `PERSON1 YASH NAIK/contracts/` |
| **Person 2** | Dhruv | Backend API Lead | `PERSON2 DHRUV/backend/` |
| **Person 3** | Yashdeep | AI Engine Lead | `PERSON3 YASHDEEP/` |
| **Person 4** | Suzan | Frontend UI Lead | `PERSON4 SUZAN/` |

---

## 3. Technology Stack

### Smart Contracts (Person 1)
| Component | Technology | Version |
|:---|:---|:---|
| Language | Solidity | `0.8.24` |
| Framework | Hardhat | `^2.22.10` |
| Security | OpenZeppelin Contracts (ReentrancyGuard, Ownable, Pausable) | `^5.0.2` |
| Testing | Hardhat + Chai | Built-in |
| Deployment | Hardhat scripts | Local (8545) / Polygon Amoy |

### Backend API (Person 2)
| Component | Technology | Version |
|:---|:---|:---|
| Runtime | Node.js + TypeScript | `^20.x` / `^5.7.3` |
| Framework | Express.js | `^4.21.2` |
| ORM | Prisma Client | `^5.22.0` |
| Database | SQLite (dev) / PostgreSQL (prod) | — |
| Auth | JWT + SIWE (EIP-191) | `jsonwebtoken ^9.0.2` |
| Validation | Zod | `^3.24.2` |
| Web3 | Ethers.js | `^6.13.5` |
| File Upload | Multer | `^1.4.5` |
| Rate Limiting | express-rate-limit | `^7.5.0` |
| Dev Server | tsx (watch mode) | `^4.19.3` |

### AI Engine (Person 3)
| Component | Technology | Version |
|:---|:---|:---|
| Language | Python | `3.10+` |
| Framework | FastAPI | `>=0.110.0` |
| Server | Uvicorn | `>=0.28.0` |
| Models | Pydantic v2 | `>=2.6.0` |
| HTTP Client | httpx | `>=0.27.0` |
| Testing | Pytest | `>=8.0.0` |
| LLM Integration | OpenAI API / LangChain | Via env config |

### Frontend UI (Person 4)
| Component | Technology | Version |
|:---|:---|:---|
| Library | React | `^18.3.1` |
| Build Tool | Vite | `^5.4.11` |
| Styling | Tailwind CSS | `^3.4.16` |
| Web3 | Ethers.js v6 | `^6.13.4` |
| Icons | Lucide React | `^0.468.0` |
| Testing | Vitest | `^1.6.0` |

### Monorepo Root
| Component | Technology | Purpose |
|:---|:---|:---|
| Concurrently | `^8.2.2` | Run 4 services in parallel |
| Ethers.js | `^6.13.5` | Shared canonical hash utilities |
| Scripts | PowerShell + Bash + Node.js | Automation |

---

## 4. Architecture Overview

```
+---------------------------------------------------------------------------------------+
|                                    SANKALP PLATFORM                                   |
+---------------------------------------------------------------------------------------+
|                                                                                       |
|   +-----------------------+                    +----------------------------------+   |
|   |   PERSON 4: FRONTEND  |                    |      PERSON 2: BACKEND API       |   |
|   |   (React 18 + Vite)   |                    |  (Express + TypeScript + Prisma)  |   |
|   |   Port: 5173           |  REST + JWT Auth   |  Port: 4000                      |   |
|   |                       |<------------------>|                                  |   |
|   | - SANKALP Fintech UI  |                    | - SIWE Auth & Session Mgmt       |   |
|   | - Web3 Direct Wallet  |                    | - Community Posts & Proposals    |   |
|   | - Legal PDF Exporter  |                    | - Threads & Timeline Ledger      |   |
|   | - IPFS & SBT Cards    |                    | - Deadline Watcher Cron          |   |
|   +-----------+-----------+                    +-----------------+----------------+   |
|               |                                                  |                    |
|               | Web3 RPC (Ethers.js)                             | HTTP Proxy         |
|               v                                                  v                    |
|   +-----------------------+                    +----------------------------------+   |
|   |   PERSON 1: CONTRACTS |                    |      PERSON 3: AI ENGINE         |   |
|   |   (Solidity 0.8.24)   |                    |       (Python FastAPI)           |   |
|   |   Port: 8545           |                    |   Port: 8000                     |   |
|   |                       |                    |                                  |   |
|   | - FairWork.sol Escrow |                    | - Canonical Agreement Generator  |   |
|   | - 3-Arbitrator Median |                    | - GitHub AST & PR Inspector      |   |
|   | - Late Penalty Math   |                    | - Evidence Dispute Summarizer    |   |
|   | - Review Auto-Claim   |                    | - Prompt Injection Defense       |   |
|   +-----------------------+                    +----------------------------------+   |
|                                                                                       |
+---------------------------------------------------------------------------------------+
```

### Communication Protocols

| Seam | Transport | Auth | Description |
|:---|:---|:---|:---|
| Frontend <-> Backend | REST JSON (`:4000/api`) | JWT Bearer token | All business operations |
| Frontend <-> Blockchain | JSON-RPC via Ethers.js (`:8545`) | MetaMask signing | On-chain transactions |
| Backend <-> AI Engine | REST JSON (`:8000`) | `X-Internal-Key` header | AI drafting, analysis, dispute |
| Backend <-> Blockchain (Oracle) | JSON-RPC via Ethers.js (`:8545`) | Oracle private key | `recordProgress`, `recordAiRecommendation` |

---

## 5. Repository Structure

```
ThandaPaani_college_round-integration-merge-all/
├── .env / .env.example          # Root environment configuration
├── package.json                 # Monorepo scripts (dev, test:all, deploy, etc.)
├── README.md                    # Quick start guide
├── RESEARCH.md                  # Comprehensive whitepaper & research
├── features.md                  # Feature bullet list
├── GIT_GUIDE.md                 # Git workflow instructions
│
├── scripts/
│   ├── dev-up.ps1               # Windows automated startup script
│   ├── dev-up.sh                # Linux/macOS startup script
│   ├── setup-demo.js            # One-time demo data seeding
│   ├── test-schema-agreement.mjs # Cross-language hash verification
│   └── e2e/                     # End-to-end test scenarios
│
├── shared/
│   ├── canonicalHash.js         # Shared Keccak-256 hashing utility
│   ├── abi/                     # Shared contract ABI
│   ├── schema/                  # Shared JSON schemas
│   ├── deployments/             # Contract deployment addresses
│   └── test-vectors/            # Cross-language hash test vectors
│
├── docs/
│   ├── ARCHITECTURE.md          # Detailed data flow & architecture
│   ├── COMMON_CONTEXT.md        # Cross-persona integration context
│   ├── COVERAGE.md              # Test coverage report
│   ├── DEMO_SCRIPT.md           # Live demo walkthrough
│   ├── INTEGRATION_REPORT.md    # Integration testing report
│   └── MERGE_LOG.md             # Merge history log
│
├── PERSON1 YASH NAIK/contracts/
│   ├── contracts/
│   │   └── FairWork.sol         # Core smart contract (1266 lines, 46KB)
│   ├── scripts/
│   │   ├── deploy.js            # Contract deployment script
│   │   ├── seed.js              # Demo data seeder
│   │   └── check-status.js      # Deployment status checker
│   ├── test/
│   │   └── FairWork.test.js     # 12 unit tests (Hardhat + Chai)
│   ├── hardhat.config.js        # Hardhat configuration
│   └── package.json
│
├── PERSON2 DHRUV/backend/
│   ├── src/
│   │   ├── app.ts               # Express app factory
│   │   ├── index.ts             # Server entry point + deadline watcher
│   │   ├── adapters/
│   │   │   └── aiAdapter.ts     # AI service adapter (draft, analyze, dispute)
│   │   ├── config/              # Environment configuration
│   │   ├── contracts/           # ABI + contract references
│   │   ├── lib/                 # Prisma client, utilities
│   │   ├── middleware/          # Error handler, auth guard, rate limiter
│   │   └── modules/
│   │       ├── auth/            # SIWE nonce + signature verification
│   │       ├── users/           # User profile CRUD
│   │       ├── community/       # Posts, proposals, threads, messages
│   │       ├── agreements/      # Agreement CRUD + approval flow
│   │       ├── milestones/      # Milestone submission + review
│   │       ├── disputes/        # Dispute lifecycle + evidence
│   │       ├── events/          # Blockchain event indexing
│   │       ├── payments/        # Payment summary & history
│   │       ├── deadlines/       # Deadline watcher + alert system
│   │       └── system/          # Health check + config endpoints
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema (12 models)
│   │   ├── seed.ts / seed.js    # Database seeding scripts
│   │   └── dev.db               # SQLite development database
│   ├── tests/
│   │   └── runTests.ts          # 26 unit tests
│   └── package.json
│
├── PERSON3 YASHDEEP/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Settings & environment
│   │   ├── core/
│   │   │   ├── cache.py         # Response caching
│   │   │   ├── hashing.py       # Canonical hash utilities
│   │   │   ├── json_repair.py   # Truncated JSON auto-repair
│   │   │   └── security.py      # Internal key verification + content wrapping
│   │   ├── models/
│   │   │   ├── common.py        # Shared Pydantic models
│   │   │   ├── draft.py         # Draft request/response models
│   │   │   ├── github.py        # GitHub analysis models
│   │   │   ├── dispute.py       # Dispute summary models
│   │   │   ├── review.py        # Review models
│   │   │   └── terms.py         # AgreementTerms schema
│   │   ├── routers/
│   │   │   ├── health.py        # GET /health
│   │   │   ├── draft.py         # POST /ai/contract/draft
│   │   │   ├── review.py        # POST /ai/contract/review
│   │   │   ├── github.py        # POST /ai/github/analyze
│   │   │   └── dispute.py       # POST /ai/dispute/summary
│   │   └── services/
│   │       ├── llm_service.py   # LLM abstraction (OpenAI)
│   │       ├── github_service.py # GitHub REST API integration
│   │       ├── anti_gaming.py   # Anti-gaming heuristics
│   │       ├── scoring.py       # Hybrid progress scoring
│   │       ├── validator.py     # Deterministic terms validation
│   │       └── mock_data.py     # Mock data for development
│   ├── prompts/
│   │   ├── contract_draft.md    # LLM system prompt for drafting
│   │   ├── contract_review.md   # LLM system prompt for review
│   │   ├── dispute_summary.md   # LLM system prompt for disputes
│   │   └── github_criteria.md   # LLM prompt for GitHub analysis
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_endpoints_mock.py
│   │   ├── test_github_fixtures.py
│   │   ├── test_json_repair.py
│   │   ├── test_prompt_injection.py
│   │   ├── test_scoring.py
│   │   └── test_validators.py
│   ├── requirements.txt
│   └── Dockerfile
│
└── PERSON4 SUZAN/
    ├── src/
    │   ├── App.jsx              # Root app layout + routing
    │   ├── main.jsx             # React DOM entry point
    │   ├── index.css            # Global styles
    │   ├── api/
    │   │   ├── client.js        # Central API client (23KB, full CRUD)
    │   │   ├── config.js        # API URL configuration
    │   │   ├── auth.js          # Auth endpoints
    │   │   ├── agreements.js    # Agreement API calls
    │   │   ├── milestones.js    # Milestone API calls
    │   │   ├── disputes.js      # Dispute API calls
    │   │   ├── posts.js         # Community post API calls
    │   │   ├── threads.js       # Thread/message API calls
    │   │   └── users.js         # User profile API calls
    │   ├── chain/
    │   │   ├── abi.json         # Contract ABI (33KB)
    │   │   ├── contract.js      # Provider + signer + contract setup
    │   │   └── transactions.js  # All on-chain transaction wrappers
    │   ├── components/
    │   │   ├── common/          # Navbar, Sidebar, TopBar, Footer, NetworkBanner, etc.
    │   │   ├── ui/              # Button, Card, Badge, Modal, AddressChip, etc. (17 files)
    │   │   ├── agreements/      # ExportContractModal
    │   │   ├── amendments/      # Amendment components
    │   │   ├── community/       # Community components
    │   │   ├── dashboard/       # MilestoneCard, AiProgressCard, etc. (6 files)
    │   │   ├── disputes/        # AiDisputeSummary, ArbitratorVoteCard, etc. (4 files)
    │   │   ├── payments/        # PaymentSummaryCards, MilestonePaymentTable
    │   │   ├── reputation/      # ReputationCard
    │   │   ├── timeline/        # Timeline components
    │   │   └── wizard/          # ChainWizard, PlainLanguageModal, VerificationBadge
    │   ├── context/
    │   │   ├── WalletContext.jsx # Wallet state (address, chain, JWT, SIWE)
    │   │   └── ToastContext.jsx  # Toast notification system
    │   ├── lib/
    │   │   ├── canonicalHash.js  # Frontend canonical hash utility
    │   │   ├── formatters.js     # Number/date/address formatting
    │   │   ├── ipfsHelper.js     # IPFS CIDv1 generation
    │   │   ├── latePenalty.js    # Late penalty calculation
    │   │   └── termsToChain.js   # Terms -> smart contract args converter
    │   ├── mock/                 # Mock data store for development
    │   └── pages/
    │       ├── LandingPage.jsx        # Public landing page
    │       ├── DashboardPage.jsx      # Main dashboard (35KB)
    │       ├── CommunityPage.jsx      # Community hub (job/service posts)
    │       ├── ChatPage.jsx           # Direct messaging
    │       ├── DraftPage.jsx          # AI draft review + editing
    │       ├── AgreementDetailPage.jsx # Agreement detail + milestones
    │       ├── MyAgreementsPage.jsx   # All user agreements
    │       ├── PaymentsPage.jsx       # Payment tracker
    │       ├── DisputesPage.jsx       # Dispute management
    │       ├── ClientsPage.jsx        # Client/freelancer directory
    │       ├── AnalyticsPage.jsx      # Performance analytics (28KB)
    │       ├── ProfilePage.jsx        # User profile
    │       └── AdminPage.jsx          # Contract owner admin panel
    ├── tailwind.config.js       # Design token configuration
    ├── vite.config.js           # Vite build configuration
    └── package.json
```

---

## 6. Feature Catalogue

### 6.1 AI Agreement Drafting

**What it does:** Converts natural-language project chats and community post contexts into structured, milestone-based contract terms.

**How it works:**
1. Client and freelancer negotiate in the **Community Chat** (threads with messages stored off-chain in Prisma).
2. Client clicks "Generate AI Draft" — the Backend sends thread messages + post context to the AI Engine.
3. AI Engine (`POST /ai/contract/draft`) processes the input through an LLM with a system prompt (`prompts/contract_draft.md`), sanitizing user input via `wrap_untrusted_content()`.
4. Output: Validated `AgreementTerms` JSON with title, description, milestones (title, amount, deadline, acceptance criteria), penalty terms, revision policies, and GitHub repo info.
5. The AI retries up to 3 times with validator feedback if deterministic validation fails.
6. Fallback: If the LLM is unavailable, a deterministic mock draft is generated.

**Where it lives:**
| Layer | File(s) |
|:---|:---|
| AI Router | `PERSON3 YASHDEEP/app/routers/draft.py` |
| AI Service | `PERSON3 YASHDEEP/app/services/llm_service.py`, `validator.py` |
| LLM Prompt | `PERSON3 YASHDEEP/prompts/contract_draft.md` |
| Backend Adapter | `PERSON2 DHRUV/backend/src/adapters/aiAdapter.ts` — `draftAgreement()` |
| Backend Route | `PERSON2 DHRUV/backend/src/modules/agreements/agreement.service.ts` |
| Frontend Page | `PERSON4 SUZAN/src/pages/DraftPage.jsx` |
| Frontend API | `PERSON4 SUZAN/src/api/agreements.js` |

---

### 6.2 Smart Escrow Payments

**What it does:** Non-custodial on-chain escrow locks native cryptocurrency (MATIC/ETH) into the `FairWork.sol` smart contract until deliverables are verified.

**How it works:**
1. Client creates on-chain agreement via `createAgreement()` with milestone amounts, deadlines, and penalty terms.
2. Freelancer accepts via `acceptAgreement()` — status moves to `AwaitingFunding`.
3. Client funds via `fundAgreement()` sending exact `totalAmount` as `msg.value` — status moves to `Active`, funds are locked.
4. Upon milestone approval (`approveMilestone()`), the contract:
   - Calculates late penalty (if past deadline): `penaltyBps = daysLate * latePenaltyBpsPerDay` (capped at `maxLatePenaltyBps`)
   - Deducts platform fee: `fee = (amount - penalty) * feeBps / 10000` (default 1%)
   - Transfers: Freelancer gets `amount - penalty - fee`, client gets `penalty`, treasury gets `fee`
5. **Conservation of Value Invariant**: `locked + released + disputed + refunded + feesPaid = totalFunded`

**Where it lives:**
| Layer | File(s) |
|:---|:---|
| Smart Contract | `PERSON1 YASH NAIK/contracts/contracts/FairWork.sol` (lines 276–594) |
| Frontend Transactions | `PERSON4 SUZAN/src/chain/transactions.js` |
| Frontend Converter | `PERSON4 SUZAN/src/lib/termsToChain.js` |
| Frontend Wizard | `PERSON4 SUZAN/src/components/wizard/ChainWizard.jsx` |

---

### 6.3 Milestone Tracking & Timers

**What it does:** Automated milestone workflows with review window auto-release and late delivery penalties.

**How it works:**
1. **Submission**: Freelancer calls `submitMilestone(id, idx, submissionHash, commitSha)` — starts review timer.
2. **Review Window**: Client has `reviewWindow` seconds to approve or reject.
3. **Auto-Approval**: If client remains silent past the review window, freelancer can call `claimAfterReviewWindow()` to auto-release funds.
4. **Rejection**: Client can reject with `rejectMilestone(id, idx, reasonHash)` — `revisionsCount++` — freelancer can resubmit up to `maxRevisions` times.
5. **Reclaim**: If a milestone is still Pending past `deadline + graceWindow`, or Rejected past `rejectionTime + reviewWindow`, the client can call `reclaimMissedMilestone()` to recover funds.
6. **Backend Deadline Watcher**: A cron job runs every 60 seconds (`DeadlineWatcherService`) to detect:
   - Deadlines approaching (within 24h) — `DEADLINE_APPROACHING` alert
   - Review windows expiring — `REVIEW_WINDOW_EXPIRING` alert
   - Breached deadlines — `DEADLINE_BREACHED` alert

**Where it lives:**
| Layer | File(s) |
|:---|:---|
| Smart Contract | `FairWork.sol` — `submitMilestone()`, `claimAfterReviewWindow()`, `rejectMilestone()`, `reclaimMissedMilestone()` |
| Backend Watcher | `PERSON2 DHRUV/backend/src/modules/deadlines/deadlineWatcher.service.ts` |
| Backend Alerts | `PERSON2 DHRUV/backend/src/modules/deadlines/alert.routes.ts` |
| Frontend Dashboard | `PERSON4 SUZAN/src/components/dashboard/MilestoneCard.jsx` |
| Frontend Timer | `PERSON4 SUZAN/src/components/ui/CountdownTimer.jsx` |
| Frontend Modal | `PERSON4 SUZAN/src/components/dashboard/SubmitMilestoneModal.jsx` |

---

### 6.4 GitHub Deliverable Verification

**What it does:** Automated code inspection evaluating GitHub commits, PR diffs, AST changes, and test suite results against milestone acceptance criteria.

**How it works:**
1. Freelancer submits milestone with a GitHub commit SHA and repo URL.
2. Backend calls AI Engine `POST /ai/github/analyze` with repo URL, branch, commit SHA, and acceptance criteria.
3. AI Engine fetches from GitHub REST API:
   - Commit lineage and count
   - Merged PRs in time range
   - Files changed and lines added
   - CI/CD test status and release tags
   - Contributor list
4. **Anti-Gaming Analysis**: Detects suspicious patterns:
   - Commit clustering (many commits in short time)
   - Trivial commits (empty messages, whitespace-only changes)
   - Force pushes or rebase anomalies
5. **Hybrid Scoring**: `40% deterministic signals + 60% LLM criteria check`
   - Deterministic: commit count, files changed, tests passing, release tag
   - LLM: Evaluates each acceptance criterion against actual code changes
6. Result: Advisory progress score in basis points (0–10,000) stored in DB and signed on-chain by Oracle.

**Where it lives:**
| Layer | File(s) |
|:---|:---|
| AI Router | `PERSON3 YASHDEEP/app/routers/github.py` |
| AI GitHub Service | `PERSON3 YASHDEEP/app/services/github_service.py` |
| AI Anti-Gaming | `PERSON3 YASHDEEP/app/services/anti_gaming.py` |
| AI Scoring | `PERSON3 YASHDEEP/app/services/scoring.py` |
| LLM Prompt | `PERSON3 YASHDEEP/prompts/github_criteria.md` |
| Backend Adapter | `PERSON2 DHRUV/backend/src/adapters/aiAdapter.ts` — `analyzeMilestone()` |
| Smart Contract | `FairWork.sol` — `recordProgress()` |
| Frontend Card | `PERSON4 SUZAN/src/components/dashboard/AiProgressCard.jsx` |
| Frontend Modal | `PERSON4 SUZAN/src/components/dashboard/GithubDeliverableModal.jsx` |

---

### 6.5 3-Arbitrator Dispute Resolution

**What it does:** Decentralized dispute handling using 3 pseudorandomly-selected peer arbitrators who vote on payout splits, with AI fallback.

**How it works:**
1. Either party calls `raiseDispute(id, idx, evidenceHash)` on a Submitted or Rejected milestone.
2. Milestone funds shift from `locked` to `disputed`.
3. **Arbitrator Selection**: 3 distinct arbitrators chosen pseudorandomly from the pool (using `block.prevrandao + block.timestamp`) excluding client and freelancer.
4. **Evidence Phase**: Both parties submit additional evidence hashes via `submitEvidence()`.
5. **AI Recommendation**: Backend Oracle calls `recordAiRecommendation()` with an advisory freelancer share (0–10,000 bps).
6. **Voting**: Each selected arbitrator calls `castVote(id, idx, freelancerShareBps)` within `votingWindow` (default 3 days).
7. **Finalization** (via `finalizeDispute()`):
   - **>=2 votes cast**: Median of votes (method: `VOTE`) — immune to single rogue arbitrator
   - **<2 votes + AI recommendation**: AI share used (method: `AI_FALLBACK`)
   - **No AI recommendation**: Milestone's `aiProgressBps` used (method: `PROGRESS_FALLBACK`)
8. Payout: Freelancer gets `share * amount - fee`, client gets remainder, treasury gets fee.

**Where it lives:**
| Layer | File(s) |
|:---|:---|
| Smart Contract | `FairWork.sol` — `raiseDispute()`, `submitEvidence()`, `recordAiRecommendation()`, `castVote()`, `finalizeDispute()` (lines 703–929) |
| AI Dispute | `PERSON3 YASHDEEP/app/routers/dispute.py` |
| LLM Prompt | `PERSON3 YASHDEEP/prompts/dispute_summary.md` |
| Backend Adapter | `PERSON2 DHRUV/backend/src/adapters/aiAdapter.ts` — `summarizeDispute()` |
| Backend Module | `PERSON2 DHRUV/backend/src/modules/disputes/` |
| Frontend Page | `PERSON4 SUZAN/src/pages/DisputesPage.jsx` |
| Frontend Components | `PERSON4 SUZAN/src/components/disputes/` (4 files: AiDisputeSummary, ArbitratorVoteCard, EvidenceThread, RaiseDisputeModal) |

---

### 6.6 Soulbound Reputation Badges (ERC-5192)

**What it does:** Non-transferable on-chain proof-of-work tokens representing completed milestones, on-time delivery, and integrity.

**How it works:**
- After milestone completion, the platform can issue a Soulbound Token (SBT) bound to the freelancer's wallet.
- SBTs are non-transferable (ERC-5192 standard) — they permanently stay with the wallet that earned them.
- Frontend visualizes earned badges with rich metadata.

**Where it lives:**
| Layer | File(s) |
|:---|:---|
| Frontend Component | `PERSON4 SUZAN/src/components/reputation/ReputationCard.jsx` |

---

### 6.7 Contract & PDF Export

**What it does:** Downloadable legal agreement certificates with cryptographic Keccak-256 validation hash.

**How it works:**
- Users can export a finalized agreement as a printable legal contract.
- The export includes: agreement title, parties, milestones, amounts, deadlines, penalty terms, and the canonical Keccak-256 hash for verification.
- Supports both PDF rendering and JSON data download.

**Where it lives:**
| Layer | File(s) |
|:---|:---|
| Frontend Component | `PERSON4 SUZAN/src/components/agreements/ExportContractModal.jsx` |

---

### 6.8 Web3 Wallet Authentication (SIWE)

**What it does:** Secure Sign-In with Ethereum using MetaMask and cryptographic nonce-based verification.

**How it works:**
1. Frontend requests a nonce: `GET /api/auth/nonce?address=0x...` — Backend creates/updates user with unique nonce.
2. Frontend asks MetaMask to sign: `signer.signMessage("FairWork login: <nonce>")`.
3. Frontend sends signature: `POST /api/auth/verify` — Backend recovers address from EIP-191 signature, verifies match, issues JWT.
4. JWT stored in `localStorage` and sent as `Authorization: Bearer <token>` on all subsequent requests.
5. **Demo Mode**: Pre-funded Hardhat accounts can authenticate directly using private keys (no MetaMask needed).
6. **Account Switching**: UI supports quick switching between Client, Freelancer, and Arbitrator demo personas.

**Where it lives:**
| Layer | File(s) |
|:---|:---|
| Backend Auth | `PERSON2 DHRUV/backend/src/modules/auth/` (routes, controller, service, schema) |
| Backend Middleware | `PERSON2 DHRUV/backend/src/middleware/` (auth guard) |
| Frontend Context | `PERSON4 SUZAN/src/context/WalletContext.jsx` |
| Frontend API | `PERSON4 SUZAN/src/api/auth.js` |
| Frontend Modal | `PERSON4 SUZAN/src/components/common/ConnectWalletModal.jsx` |

---

### 6.9 Community Hub & Negotiation

**What it does:** Marketplace for clients to post jobs, freelancers to submit proposals, and parties to negotiate via threaded messages.

**How it works:**
- **Posts**: Clients create `JOB` posts or freelancers create `SERVICE` posts with title, description, budget, and tags.
- **Proposals**: Freelancers respond with a cover letter, proposed budget, and duration.
- **Threads**: When a proposal is accepted, a private thread opens for direct negotiation.
- **Messages**: Real-time message exchange within threads — this context feeds the AI agreement drafter.
- Post statuses: `OPEN` -> `IN_PROGRESS` -> `CLOSED`.

**Where it lives:**
| Layer | File(s) |
|:---|:---|
| Backend Module | `PERSON2 DHRUV/backend/src/modules/community/` (routes, controller, service) |
| Database Models | `schema.prisma` — `Post`, `Proposal`, `Thread`, `Message` |
| Frontend Page | `PERSON4 SUZAN/src/pages/CommunityPage.jsx` |
| Frontend Chat | `PERSON4 SUZAN/src/pages/ChatPage.jsx` |
| Frontend API | `PERSON4 SUZAN/src/api/posts.js`, `threads.js` |

---

### 6.10 On-Chain Event Timeline & Audit Log

**What it does:** Chronological audit trail of all blockchain events indexed from on-chain logs.

**How it works:**
- Backend indexes emitted smart contract events (`AgreementCreated`, `AgreementFunded`, `MilestoneSubmitted`, `MilestonePaid`, `DisputeRaised`, `DisputeResolved`, etc.) and stores them in the `ChainEvent` table.
- Frontend fetches and renders a timeline view per agreement.
- Each event entry includes: event name, transaction hash, block number, arguments, and timestamp.

**Where it lives:**
| Layer | File(s) |
|:---|:---|
| Smart Contract Events | `FairWork.sol` (lines 145–237) — 16 event types |
| Backend Module | `PERSON2 DHRUV/backend/src/modules/events/` |
| Database Model | `schema.prisma` — `ChainEvent` |
| Frontend Components | `PERSON4 SUZAN/src/components/timeline/` |
| Frontend UI | `PERSON4 SUZAN/src/components/ui/TimelineItem.jsx` |

---

### 6.11 Late Penalty System

**What it does:** Automatic penalty deductions for late milestone delivery.

**How it works:**
- Each agreement specifies `latePenaltyBpsPerDay` and `maxLatePenaltyBps`.
- When a milestone is approved after its deadline, the contract calculates:
  ```
  daysLate = (submissionTime - deadline) / 1 day  (rounded up)
  penaltyBps = min(daysLate * latePenaltyBpsPerDay, maxLatePenaltyBps)
  penaltyAmount = (milestoneAmount * penaltyBps) / 10000
  ```
- Penalty is refunded to the client; freelancer receives `amount - penalty - fee`.

**Where it lives:**
| Layer | File(s) |
|:---|:---|
| Smart Contract | `FairWork.sol` — `_processPayout()` internal function |
| Frontend Preview | `PERSON4 SUZAN/src/components/dashboard/LatePenaltyPreview.jsx` |
| Frontend Calculator | `PERSON4 SUZAN/src/lib/latePenalty.js` |

---

### 6.12 Amendment Proposals

**What it does:** Either party can propose amendments to extend deadlines or update terms, requiring counterparty acceptance.

**How it works:**
1. Either client or freelancer calls `proposeAmendment(id, idx, newDeadline, newTermsHash, newTermsURI)`.
2. The counterparty reviews and calls `acceptAmendment(id, amendmentId)`.
3. Upon acceptance, the contract updates the milestone deadline and/or agreement terms hash.

**Where it lives:**
| Layer | File(s) |
|:---|:---|
| Smart Contract | `FairWork.sol` — `proposeAmendment()`, `acceptAmendment()` (lines 608–688) |
| Frontend Components | `PERSON4 SUZAN/src/components/amendments/` |

---

### 6.13 Role-Based Dashboard

**What it does:** Differentiated UI experience based on whether the user is a Client or Freelancer.

**How it works:**
- **WalletContext** exposes `user.role` (`CLIENT`, `FREELANCER`, or `BOTH`).
- **Sidebar** renders different navigation labels:
  - Client: Dashboard, Hire Talent, Agreements, Spending, Disputes, Messages, Freelancers, Analytics
  - Freelancer: Dashboard, Find Work, My Contracts, Earnings, Disputes, Messages, My Clients, Performance
- **DashboardPage** (35KB) adapts cards, stats, and quick actions based on role.
- Role badge displayed in sidebar with visual differentiation (Forest Green for Freelancer, Coral for Client).

**Where it lives:**
| Layer | File(s) |
|:---|:---|
| Frontend Sidebar | `PERSON4 SUZAN/src/components/common/Sidebar.jsx` |
| Frontend Dashboard | `PERSON4 SUZAN/src/pages/DashboardPage.jsx` |
| Frontend Context | `PERSON4 SUZAN/src/context/WalletContext.jsx` |
| Frontend Role Banner | `PERSON4 SUZAN/src/components/common/RoleBanner.jsx` |

---

### 6.14 Analytics & Performance

**What it does:** Rich data visualizations for tracking performance metrics, agreement stats, and payment analytics.

**How it works:**
- Aggregates data from agreements, milestones, payments, and disputes.
- Displays charts, KPI cards, and trend analysis.
- Adapts metrics based on user role (Earnings for freelancers, Spending for clients).

**Where it lives:**
| Layer | File(s) |
|:---|:---|
| Frontend Page | `PERSON4 SUZAN/src/pages/AnalyticsPage.jsx` (28KB, 644+ lines) |

---

### 6.15 Admin Council

**What it does:** Contract owner panel for managing arbitrators, oracle, treasury, fees, and system settings.

**How it works:**
- Only the contract owner can:
  - Add/remove arbitrators via `addArbitrator()` / `removeArbitrator()`
  - Set oracle address via `setOracle()`
  - Set treasury address via `setTreasury()`
  - Adjust platform fee (0–500 bps / 0%–5%) via `setFeeBps()`
  - Update voting window via `setVotingWindow()`
  - Pause/unpause contract via `pause()` / `unpause()`

**Where it lives:**
| Layer | File(s) |
|:---|:---|
| Smart Contract | `FairWork.sol` — Admin functions (lines 932–998) |
| Frontend Page | `PERSON4 SUZAN/src/pages/AdminPage.jsx` |

---

### 6.16 Network Switcher

**What it does:** One-click switching between Localhost Hardhat (Chain ID 31337) and Polygon Amoy Testnet (Chain ID 80002).

**How it works:**
- `WalletContext` tracks `chainId` and `configuredChainId`.
- `NetworkBanner` displays a warning when the connected chain doesn't match the configured chain.
- `switchNetwork()` calls MetaMask's `wallet_switchEthereumChain` / `wallet_addEthereumChain`.

**Where it lives:**
| Layer | File(s) |
|:---|:---|
| Frontend Context | `PERSON4 SUZAN/src/context/WalletContext.jsx` — `handleSwitchNetwork()` |
| Frontend Banner | `PERSON4 SUZAN/src/components/common/NetworkBanner.jsx` |
| Frontend Chain | `PERSON4 SUZAN/src/chain/contract.js` — `switchNetwork()` |

---

### 6.17 Deadline Watcher Service

**What it does:** Background cron service that monitors milestone deadlines and generates alerts.

**How it works:**
- Runs every 60 seconds (`DeadlineWatcherService.startWatcher(60000)`).
- Scans all active milestones for:
  - Deadlines approaching within 24 hours — creates `DEADLINE_APPROACHING` alert (severity: WARNING)
  - Review windows about to expire — creates `REVIEW_WINDOW_EXPIRING` alert
  - Past deadlines with no submission — creates `DEADLINE_BREACHED` alert (severity: CRITICAL)
- Deduplicates alerts to avoid repeat notifications.
- Gracefully shut down on SIGINT/SIGTERM signals.

**Where it lives:**
| Layer | File(s) |
|:---|:---|
| Backend Service | `PERSON2 DHRUV/backend/src/modules/deadlines/deadlineWatcher.service.ts` |
| Backend Routes | `PERSON2 DHRUV/backend/src/modules/deadlines/alert.routes.ts` |
| Database Model | `schema.prisma` — `Alert` |
| Server Bootstrap | `PERSON2 DHRUV/backend/src/index.ts` (line 18) |

---

### 6.18 Anti-Gaming & Prompt Injection Defense

**What it does:** Security layers preventing adversarial manipulation of AI analysis and agreement drafting.

**Anti-Gaming Heuristics (GitHub Analysis):**
- Detects commit clustering (many commits in a very short window)
- Identifies trivial/empty commits (whitespace changes, empty messages)
- Flags force pushes and rebase anomalies
- Applies confidence penalties and score deductions for suspicious patterns

**Prompt Injection Defense (AI Drafting):**
- All user-supplied content is wrapped with `wrap_untrusted_content()` before being sent to the LLM.
- Regex and semantic safety filters block injection attempts (e.g., "ignore previous instructions").
- Outputs validated against strict Pydantic schemas.
- Truncated JSON auto-repair via `json_repair.py`.

**Where it lives:**
| Layer | File(s) |
|:---|:---|
| Anti-Gaming | `PERSON3 YASHDEEP/app/services/anti_gaming.py` |
| Security | `PERSON3 YASHDEEP/app/core/security.py` |
| JSON Repair | `PERSON3 YASHDEEP/app/core/json_repair.py` |
| Validators | `PERSON3 YASHDEEP/app/services/validator.py` |
| Tests | `PERSON3 YASHDEEP/tests/test_prompt_injection.py` |

---

## 7. Smart Contract Deep Dive

### Contract: `FairWork.sol`

| Property | Value |
|:---|:---|
| File | `PERSON1 YASH NAIK/contracts/contracts/FairWork.sol` |
| Size | 1,266 lines, 46KB |
| Solidity Version | `0.8.24` |
| Inherits | `ReentrancyGuard`, `Ownable`, `Pausable` (OpenZeppelin v5) |

### State Machine

```
Draft -> AwaitingFunding -> Active -> Completed
                                   \-> Disputed -> Resolved
                         /-> Cancelled (before funding)
```

### Milestone State Machine

```
Pending -> Submitted -> Approved -> Paid
                     \-> Rejected -> Re-Submitted (if revisions < max)
                     \-> Disputed -> Paid (after resolution)
          \-> Refunded (if reclaimed by client)
```

### Key Functions

| Function | Caller | Purpose |
|:---|:---|:---|
| `createAgreement()` | Client | Create draft with milestones |
| `acceptAgreement()` | Freelancer | Accept draft -> AwaitingFunding |
| `fundAgreement()` | Client | Lock funds -> Active |
| `cancelUnfunded()` | Either | Cancel before funding |
| `submitMilestone()` | Freelancer | Submit work + commit SHA |
| `recordProgress()` | Oracle | Record AI progress score |
| `approveMilestone()` | Client | Approve and pay freelancer |
| `claimAfterReviewWindow()` | Freelancer | Auto-claim after silence |
| `rejectMilestone()` | Client | Reject + increment revisions |
| `reclaimMissedMilestone()` | Client | Reclaim after missed deadline |
| `proposeAmendment()` | Either | Propose deadline/terms change |
| `acceptAmendment()` | Counterparty | Accept amendment |
| `raiseDispute()` | Either | Escalate to arbitration |
| `submitEvidence()` | Either | Add evidence to dispute |
| `recordAiRecommendation()` | Oracle | Record AI dispute advice |
| `castVote()` | Arbitrator | Vote on freelancer share |
| `finalizeDispute()` | Anyone | Finalize after voting deadline |
| `addArbitrator()` | Owner | Add to arbitrator pool |
| `removeArbitrator()` | Owner | Remove from pool |
| `setOracle()` | Owner | Update oracle address |
| `setTreasury()` | Owner | Update treasury address |
| `setFeeBps()` | Owner | Set platform fee (max 5%) |
| `setVotingWindow()` | Owner | Set dispute voting window |

### Events (16+ total)

`AgreementCreated`, `AgreementAccepted`, `AgreementFunded`, `AgreementCancelled`, `AgreementCompleted`, `MilestoneSubmitted`, `ProgressRecorded`, `MilestoneApproved`, `MilestoneRejected`, `MilestonePaid`, `MilestoneRefunded`, `AmendmentProposed`, `AmendmentAccepted`, `DisputeRaised`, `EvidenceSubmitted`, `ArbitratorsSelected`, `VoteCast`, `AiRecommendationRecorded`, `DisputeResolved`

---

## 8. Backend API Reference

**Base URL:** `http://localhost:4000/api`

### Authentication
| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/auth/nonce?address=0x...` | Request nonce for SIWE |
| POST | `/auth/verify` | Verify signature, get JWT |
| GET | `/auth/me` | Get current user profile |

### Community
| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/community/posts` | List all posts (with filters) |
| POST | `/community/posts` | Create a job/service post |
| GET | `/community/posts/:id` | Get post details |
| POST | `/community/posts/:id/proposals` | Submit a proposal |
| GET | `/community/threads` | List user's threads |
| POST | `/community/threads` | Create a new thread |
| GET | `/community/threads/:id` | Get thread with messages |
| POST | `/community/threads/:id/messages` | Send a message |

### Agreements
| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/agreements` | List user's agreements |
| POST | `/agreements/draft` | Create AI-generated draft |
| GET | `/agreements/:id` | Get agreement details |
| PUT | `/agreements/:id` | Update draft terms |
| POST | `/agreements/:id/approve-draft` | Approve draft (mutual lock) |
| POST | `/agreements/:id/link-chain` | Link off-chain to on-chain ID |

### Milestones
| Method | Endpoint | Description |
|:---|:---|:---|
| POST | `/milestones/:id/submit` | Submit milestone work |
| POST | `/milestones/:id/analyze` | Trigger GitHub AI analysis |

### Disputes
| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/disputes` | List disputes |
| POST | `/disputes` | Create a dispute |
| POST | `/disputes/:id/evidence` | Upload evidence file |
| POST | `/disputes/:id/summarize` | Request AI dispute summary |

### Events
| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/events/agreement/:id` | Get chain events for agreement |

### Payments
| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/payments/summary/:id` | Get payment summary for agreement |

### Users
| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/users/me` | Get authenticated user profile |
| PUT | `/users/me` | Update profile (name, bio, skills, role) |

### System
| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/health` | Server health check |
| GET | `/config` | Public configuration (chain ID, contract address) |

### Alerts
| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/alerts` | List active alerts |
| PUT | `/alerts/:id/resolve` | Mark alert as resolved |

---

## 9. AI Engine Endpoints & Services

**Base URL:** `http://localhost:8000`

### Endpoints

| Method | Endpoint | Description | Auth |
|:---|:---|:---|:---|
| GET | `/health` | Health check | None |
| POST | `/ai/contract/draft` | Generate structured agreement from chat | `X-Internal-Key` |
| POST | `/ai/contract/review` | Review agreement for unfair/missing terms | `X-Internal-Key` |
| POST | `/ai/github/analyze` | Analyze GitHub repo against criteria | `X-Internal-Key` |
| POST | `/ai/dispute/summary` | Generate neutral dispute summary | `X-Internal-Key` |

### Internal Services

| Service | File | Purpose |
|:---|:---|:---|
| `llm_service` | `services/llm_service.py` | OpenAI API abstraction with JSON mode + retry |
| `github_service` | `services/github_service.py` | GitHub REST API (commits, PRs, files, CI) |
| `anti_gaming` | `services/anti_gaming.py` | Commit pattern fraud detection |
| `scoring` | `services/scoring.py` | Hybrid progress score (40% signals + 60% LLM) |
| `validator` | `services/validator.py` | Deterministic terms validation (13KB, 400+ lines) |
| `mock_data` | `services/mock_data.py` | Mock responses for all endpoints |

### Core Utilities

| Utility | File | Purpose |
|:---|:---|:---|
| `security` | `core/security.py` | `X-Internal-Key` verification + `wrap_untrusted_content()` |
| `hashing` | `core/hashing.py` | Canonical Keccak-256 hashing |
| `json_repair` | `core/json_repair.py` | Auto-repair truncated LLM JSON output |
| `cache` | `core/cache.py` | Response caching |

### LLM Prompt Templates

| Prompt | File | When Used |
|:---|:---|:---|
| Contract Drafting | `prompts/contract_draft.md` | Agreement generation from chat |
| Contract Review | `prompts/contract_review.md` | Fairness and completeness review |
| GitHub Criteria | `prompts/github_criteria.md` | Acceptance criteria evaluation |
| Dispute Summary | `prompts/dispute_summary.md` | Neutral arbitration summary |

---

## 10. Frontend Pages & Components

### Pages (13 total)

| Page | File | Description | Size |
|:---|:---|:---|:---|
| LandingPage | `pages/LandingPage.jsx` | Public landing page with hero | 6.7KB |
| DashboardPage | `pages/DashboardPage.jsx` | Main dashboard with KPIs, quick actions | 35KB |
| CommunityPage | `pages/CommunityPage.jsx` | Job/service marketplace | 11.5KB |
| ChatPage | `pages/ChatPage.jsx` | Direct messaging with threads | 15.3KB |
| DraftPage | `pages/DraftPage.jsx` | AI draft review + manual editing | 24.5KB |
| AgreementDetailPage | `pages/AgreementDetailPage.jsx` | Full agreement detail + milestones | 15.7KB |
| MyAgreementsPage | `pages/MyAgreementsPage.jsx` | All user agreements list | 16.7KB |
| PaymentsPage | `pages/PaymentsPage.jsx` | Payment tracking & history | 20.6KB |
| DisputesPage | `pages/DisputesPage.jsx` | Dispute management dashboard | 14.9KB |
| ClientsPage | `pages/ClientsPage.jsx` | Client/freelancer directory | 10.2KB |
| AnalyticsPage | `pages/AnalyticsPage.jsx` | Performance analytics & charts | 28.7KB |
| ProfilePage | `pages/ProfilePage.jsx` | User profile editor | 11.3KB |
| AdminPage | `pages/AdminPage.jsx` | Contract owner admin panel | 11.2KB |

### Component Library

**UI Components** (`components/ui/` — 17 files):
`AddressChip`, `AmountDisplay`, `Badge`, `Button`, `Card`, `CountdownTimer`, `EmptyState`, `Input`, `Modal`, `ProgressBar`, `Skeleton`, `Tabs`, `TimelineItem`, `Toast`, `Tooltip`, `TxStatus`

**Common Components** (`components/common/` — 13 files):
`Navbar`, `Sidebar`, `TopBar`, `Footer`, `ConnectWalletModal`, `NetworkBanner`, `RoleBanner`, `AddressBadge`, `Badge`, `Button`, `Card`, `Modal`, `CountdownTimer`

**Feature Components**:
- `dashboard/` (6): MilestoneCard, AiProgressCard, SubmitMilestoneModal, RejectMilestoneModal, GithubDeliverableModal, LatePenaltyPreview
- `disputes/` (4): AiDisputeSummary, ArbitratorVoteCard, EvidenceThread, RaiseDisputeModal
- `wizard/` (3): ChainWizard, PlainLanguageModal, VerificationBadge
- `payments/` (2): PaymentSummaryCards, MilestonePaymentTable
- `agreements/` (1): ExportContractModal
- `reputation/` (1): ReputationCard

### Design System

| Token | Name | Hex | Usage |
|:---|:---|:---|:---|
| `ivory` | Ivory | `#F8F8F0` | Warm canvas background |
| `sage` | Sage | `#E7EFE3` | Containers, sidebars, tabs |
| `forest` | Forest Green | `#263F32` | Headers, buttons, verified states |
| `coral` | Coral | `#F28F7B` | CTAs, accents, warnings |
| `ink` | Ink | `#111713` | Typography, high-contrast text |

**Typography**: Space Grotesk (headings), Inter (body), IBM Plex Mono (hashes/addresses)

---

## 11. Database Schema (Prisma)

**Provider:** SQLite (development) / PostgreSQL (production)
**File:** `PERSON2 DHRUV/backend/prisma/schema.prisma`

### Models (12 total)

| Model | Key Fields | Purpose |
|:---|:---|:---|
| **User** | `walletAddress`, `nonce`, `role`, `name`, `bio`, `skills`, `githubUsername` | Wallet-based user account |
| **Post** | `type` (JOB/SERVICE), `title`, `description`, `budget`, `tags`, `status` | Community job/service listings |
| **Proposal** | `postId`, `freelancerId`, `coverLetter`, `proposedBudget`, `proposedDuration` | Freelancer proposals on posts |
| **Thread** | `postId`, `clientId`, `freelancerId`, `subject` | Private negotiation threads |
| **Message** | `threadId`, `senderId`, `content` | Thread messages |
| **Agreement** | `termsJson`, `canonicalHash`, `status`, `onChainAgreementId`, `onChainTxHash` | Off-chain agreement state |
| **Milestone** | `agreementId`, `milestoneIndex`, `title`, `amount`, `deadline`, `submissionCommitSha` | Off-chain milestone metadata |
| **ProgressReport** | `milestoneId`, `repoUrl`, `commitSha`, `aiSummary`, `qualityScore`, `canonicalReportHash` | AI analysis results |
| **Dispute** | `agreementId`, `raisedById`, `reason`, `aiSummary`, `oracleRecommendation` | Off-chain dispute metadata |
| **Evidence** | `disputeId`, `agreementId`, `filename`, `contentHash`, `storagePath` | Uploaded evidence files |
| **ChainEvent** | `agreementId`, `eventName`, `transactionHash`, `blockNumber`, `argsJson` | Indexed on-chain events |
| **Alert** | `agreementId`, `milestoneId`, `type`, `severity`, `message`, `resolved` | System deadline alerts |

### Agreement Status Flow

```
DRAFT -> CLIENT_APPROVED -> FREELANCER_APPROVED -> LOCKED -> ONCHAIN_LINKED -> COMPLETED / DISPUTED
```

---

## 12. Cryptographic Specifications

### Canonical Agreement Hashing (Keccak-256)

To ensure identical hashes across JavaScript (Frontend), TypeScript (Backend), Python (AI), and Solidity (Contract):

1. **Normalize** all fields:
   - Trim whitespace from strings
   - Lowercase addresses
   - Uppercase currency
   - Sort acceptance criteria arrays
2. **Serialize** with deterministic key ordering (`JSON.stringify(obj, Object.keys(obj).sort())`)
3. **Hash** with `keccak256(toUtf8Bytes(canonicalJson))`

**Cross-language verification:** `scripts/test-schema-agreement.mjs` validates identical outputs across all layers.

**Shared implementation:** `shared/canonicalHash.js`

### IPFS CIDv1 Generation

Frontend generates IPFS Content Identifiers for agreement terms documents using `lib/ipfsHelper.js` — creating verifiable content addresses without requiring a live IPFS node.

---

## 13. Environment Variables & Configuration

### Root `.env`
```env
HARDHAT_RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337
AI_SERVICE_URL=http://localhost:8000
AI_INTERNAL_KEY=fairwork_internal_secret_key
OPENAI_API_KEY=                              # For live LLM usage
GITHUB_TOKEN=                                # For GitHub API (rate limits)
BACKEND_URL=http://localhost:4000
DATABASE_URL="file:./dev.db"
JWT_SECRET=fairwork-super-secret-jwt-key-change-in-production-2026
ORACLE_PRIVATE_KEY=0xac09...                 # Hardhat Account #0
VITE_API_URL=http://localhost:4000/api
VITE_USE_MOCK=false
```

### Per-Service Configuration
- **Contracts:** `PERSON1 YASH NAIK/contracts/.env` — RPC URL, deployer private key
- **Backend:** `PERSON2 DHRUV/backend/.env` — DB URL, JWT secret, oracle key, AI service URL, mock flags
- **AI Engine:** `PERSON3 YASHDEEP/.env` — LLM API key, GitHub token, internal key, mock mode
- **Frontend:** `PERSON4 SUZAN/.env` — API URL, chain ID, contract address, mock mode

---

## 14. Setup & Quick Start

### Prerequisites
- Node.js v18+ & npm
- Python 3.10+ with pip
- MetaMask browser extension (for live Web3 mode)

### Option A: Windows PowerShell (Recommended)
```powershell
.\scripts\dev-up.ps1
```
This script starts all 4 services in order with health-check polling.

### Option B: Bash (Linux/macOS)
```bash
chmod +x ./scripts/dev-up.sh
./scripts/dev-up.sh
```

### Option C: Manual NPM
```bash
# 1. Install all dependencies
npm run install:all

# 2. Deploy contracts and seed demo data
npm run deploy
npm run setup

# 3. Start all 4 services concurrently
npm run dev
```

### Service Ports

| Service | Port | Health Check |
|:---|:---|:---|
| Hardhat Blockchain | `8545` | `http://127.0.0.1:8545` |
| AI Engine | `8000` | `http://localhost:8000/health` |
| Backend API | `4000` | `http://localhost:4000/api/health` |
| Frontend UI | `5173` | `http://localhost:5173` |

### Live Sepolia Accounts (Active)

| Role | Address | Network | Explorer |
|:---|:---|:---|:---|
| Client | `0x5eD39B1d5EF7962bb70c7Ac09F9016fE7a00E7E4` | Sepolia (11155111) | [Etherscan](https://sepolia.etherscan.io/address/0x5eD39B1d5EF7962bb70c7Ac09F9016fE7a00E7E4) |
| Freelancer | `0x9908CAB15D339845c83775120F3f8373583Cc476` | Sepolia (11155111) | [Etherscan](https://sepolia.etherscan.io/address/0x9908CAB15D339845c83775120F3f8373583Cc476) |
| Deployer / Admin | `0x3fCDb56bCFeFf21Cd18593E97C70aA95DB44E0f2` | Sepolia (11155111) | [Etherscan](https://sepolia.etherscan.io/address/0x3fCDb56bCFeFf21Cd18593E97C70aA95DB44E0f2) |
| Escrow Contract | `0xc1C0415872eA86DfdA31615B9Ad94d795974CA1e` | Sepolia (11155111) | [Etherscan](https://sepolia.etherscan.io/address/0xc1C0415872eA86DfdA31615B9Ad94d795974CA1e) |

### Demo Accounts (Local Hardhat Fallback)

| Role | Address | Account # |
|:---|:---|:---|
| Contract Owner | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | #0 |
| Client | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | #1 |
| Freelancer | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | #2 |
| Oracle | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | #3 |
| Treasury | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | #4 |
| Arbitrators 1-5 | `0x9965...4dc` through `0xa0Ee...9720` | #5-#9 |

---

## 15. Testing Suite

### Test Commands

```bash
# All tests across all 4 projects
npm run test:all

# Individual test suites
npm run test:contracts    # 12 Hardhat/Chai unit tests
npm run test:backend      # 26 unit tests (runTests.ts)
npm run test:ai           # 30 Pytest tests
npm run test:frontend     # Vitest unit tests
npm run test:seams        # Cross-language hash verification

# End-to-End (12 scenarios with EVM time travel)
npm run e2e
```

### Test Coverage

| Suite | Tests | Framework | Coverage |
|:---|:---|:---|:---|
| Smart Contracts | 12 | Hardhat + Chai | Agreement lifecycle, funding, penalties, disputes, arbitration |
| Backend API | 26 | Custom runner (tsx) | Auth, CRUD, milestones, disputes, events, payments |
| AI Engine | 30 | Pytest | Endpoints, GitHub fixtures, JSON repair, prompt injection, scoring, validators |
| Frontend | 11 | Vitest | Component rendering, state management |
| Schema Seams | 3 | Node/TS | Cross-language hash identity |
| **Total** | **82** | — | — |

### AI-Specific Tests

| Test File | What It Tests |
|:---|:---|
| `test_endpoints_mock.py` | All AI endpoints return valid schemas in mock mode |
| `test_github_fixtures.py` | GitHub data parsing, signal extraction, edge cases |
| `test_json_repair.py` | Truncated/malformed JSON auto-repair |
| `test_prompt_injection.py` | Adversarial prompt injection blocking |
| `test_scoring.py` | Hybrid progress score calculation |
| `test_validators.py` | Deterministic terms validation rules |

---

## 16. End-to-End Data Flow

### Phase 1: Community Discovery & AI Drafting
1. Client creates a JOB post via `POST /api/community/posts`
2. Freelancer submits a proposal -> accepted -> private thread opens
3. Both parties negotiate in thread messages
4. Client triggers `POST /api/agreements/draft` -> Backend calls AI `POST /ai/contract/draft`
5. AI returns structured `AgreementTerms` JSON -> saved as Draft

### Phase 2: Mutual Off-Chain Lock & Hash
6. Client approves draft -> `POST /api/agreements/:id/approve-draft`
7. Freelancer approves draft -> Agreement moves to `LOCKED`
8. Backend computes canonical Keccak-256 hash of terms

### Phase 3: On-Chain Escrow Deployment
9. Client sends `createAgreement()` transaction -> emits `AgreementCreated`
10. Freelancer sends `acceptAgreement()` -> status: `AwaitingFunding`
11. Client sends `fundAgreement()` with exact total -> funds locked, status: `Active`
12. Client links on-chain ID: `POST /api/agreements/:id/link-chain` -> Backend verifies termsHash match

### Phase 4: Delivery, AI Analysis & Payout
13. Freelancer submits milestone: `submitMilestone()` on-chain + `POST /api/milestones/:id/submit` off-chain
14. Backend triggers `POST /ai/github/analyze` -> AI evaluates repo
15. Oracle signs `recordProgress()` on-chain with advisory score
16. Client approves: `approveMilestone()` -> funds transfer (minus penalty & fee)

### Phase 5: Dispute (if needed)
17. Either party raises dispute: `raiseDispute()` -> 3 arbitrators selected
18. Evidence submitted on-chain + off-chain
19. AI generates dispute summary, Oracle records recommendation
20. Arbitrators cast votes -> `finalizeDispute()` -> median payout

---

## 17. Known Limitations & Design Decisions

1. **GitHub AI Analysis is Advisory**: The AI evaluation is purely advisory. The client retains full authority to approve/reject milestones regardless of AI score. This prevents smart contract deadlock from LLM hallucination or GitHub API outages.

2. **Pseudo-Random Arbitrator Selection**: Uses `block.prevrandao` for local development. The production upgrade path will use Chainlink VRF for verifiable randomness.

3. **Native Currency Escrow Only**: Currently supports only native currency (MATIC/ETH). ERC-20 token support (USDC, USDT) is architected as an upcoming extension.

4. **SQLite in Development**: The backend uses SQLite for rapid local development. PostgreSQL is configured for production via `DATABASE_URL`.

5. **Mock Mode Available**: All services support a mock mode (`VITE_USE_MOCK=true`, `AI_MOCK=true`, `CHAIN_MOCK=true`) for development without external dependencies (no MetaMask, no OpenAI key, no GitHub token needed).

6. **Single-Contract Architecture**: All logic lives in a single `FairWork.sol` for simplicity. A proxy-based upgradeable pattern (EIP-1967) is planned for production.

---

## 18. Future Roadmap

| Feature | Description |
|:---|:---|
| **ERC-4337 Account Abstraction** | Smart contract accounts for non-crypto users with credit card escrow funding via Paymasters |
| **Zero-Knowledge Deliverable Proofs (zk-SNARKs)** | Prove code compiles and tests pass without disclosing proprietary source code |
| **Superfluid Continuous Streaming** | Real-time per-second money streaming for hourly retainers |
| **Chainlink VRF** | Verifiable random arbitrator selection replacing `block.prevrandao` |
| **ERC-20 Token Escrow** | USDC/USDT support with live currency conversion |
| **IPFS Terms Storage** | Full agreement terms stored on IPFS with CIDv1 verification |
| **ERC-5192 SBT Minting** | Production soulbound token minting for reputation badges |
| **Cross-Chain Support** | Deploy on multiple EVM chains (Ethereum, Polygon, Arbitrum, Base) |

---

> **Document generated for Team ThandaPaani — SANKALP**
> Last updated: October 2026
