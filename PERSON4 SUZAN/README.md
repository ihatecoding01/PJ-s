# SANKALP Frontend

> **Smart Agreements and Network for Key Achievements, Ledgers and Payments**
> Tagline: *"Bridging Work and Trust"*

SANKALP provides a calm, composed fintech SaaS user interface connecting off-chain developer activities with non-custodial milestone escrow smart contracts on Polygon / Ethereum. 

---

## 🛠️ Technology Stack

- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS (custom SANKALP design tokens)
- **Web3 & Blockchain**: ethers.js v6 + MetaMask BrowserProvider
- **Icons**: Lucide React
- **Testing**: Vitest (canonical Keccak-256 hashing & terms-to-contract argument encoding)

---

## 📦 Getting Started

### 1. Installation
Navigate to the frontend folder and install dependencies:
```bash
cd "PERSON4 SUZAN"
npm install
```

### 2. Configure Environment
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

Available environment variables:
| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL of backend REST API | `http://localhost:4000/api` |
| `VITE_USE_MOCK` | Toggle zero-dependency mock mode (`true`/`false`) | `true` |
| `VITE_CHAIN_ID` | Required network ID (`31337` Hardhat, `80002` Polygon Amoy) | `31337` |
| `VITE_EXPLORER_URL` | Block explorer URL for linking transactions | `https://amoy.polygonscan.com` |
| `VITE_INR_RATE` | Optional secondary approximate INR conversion rate | `85` |

---

## 🚀 Running the App

### Option A: Mock Mode (Zero-Backend Decoupled Testing)
Set `VITE_USE_MOCK=true` in `.env`:
```bash
npm run dev
```
- Operates instantly in the browser at `http://localhost:5173`.
- Pre-populated with realistic Indian freelancer test personas (Alice Client, Bob Freelancer, Charlie Arbitrator).
- **Rule**: Blockchain transactions in mock mode are labeled *"Mock mode: no real transaction"* and never fake confirmed transaction receipts.

### Option B: Live Mode (Connected to Node & Contracts)
Set `VITE_USE_MOCK=false` in `.env`:
1. Ensure the Hardhat node is running (`http://127.0.0.1:8545`).
2. Ensure the Backend REST API is running (`http://localhost:4000`).
3. Connect your MetaMask wallet. If on the wrong chain, SANKALP will display a one-click network switch banner.
4. Launch the frontend:
```bash
npm run dev
```

---

## 🗺️ Page-to-API Mapping

All REST API communication flows through the universal client fetch wrapper (`src/api/client.js`) which appends JWT authentication and normalizes errors:

| Page / Feature | API Endpoint(s) | Smart Contract Function(s) | Purpose |
| :--- | :--- | :--- | :--- |
| **Landing & Auth** | `POST /auth/nonce`<br>`POST /auth/verify`<br>`GET /auth/me` | N/A | SIWE wallet authentication (`"FairWork login: <nonce>"`) |
| **Dashboard** | `GET /agreements`<br>`GET /alerts?resolved=false`<br>`GET /payments` | `getPaymentSummary()` | High-level metrics, upcoming milestones & payment bar |
| **Projects (Community)** | `GET /community/posts`<br>`POST /community/posts`<br>`POST /community/posts/:id/proposals` | N/A | Job & service marketplace feed, proposal submissions |
| **Messages (Chat)** | `GET /community/threads`<br>`GET /community/threads/:id/messages`<br>`POST /community/threads/:id/messages`<br>`POST /agreements/draft` | N/A | Real-time negotiation chat (5s polling) & AI agreement drafting |
| **Draft Review** | `GET /agreements/:id`<br>`PUT /agreements/:id`<br>`POST /agreements/:id/approve` | N/A | Inspection of AI terms, mutual approval & canonical hash reset |
| **Chain Setup Wizard** | `POST /agreements/:id/link` | `createAgreement()`<br>`acceptAgreement()`<br>`fundAgreement()`<br>`cancelUnfunded()` | Step-by-step on-chain creation, acceptance & funding |
| **Agreement Detail** | `GET /agreements/:id`<br>`GET /events/timeline/:id`<br>`GET /alerts` | `getAgreement()`<br>`getMilestone()` | Master milestone lifecycle view & countdown timers |
| **Milestone Panel** | `POST /milestones/:id/submit`<br>`POST /milestones/:id/review` | `submitMilestone()`<br>`approveMilestone()`<br>`rejectMilestone()`<br>`claimAfterReviewWindow()`<br>`reclaimMissedMilestone()` | Commit SHA submission, advisory AI card, approval & claim |
| **Amendments** | `GET /agreements/:id` | `proposeAmendment()`<br>`acceptAmendment()` | Scope adjustment, deadline extension & agreement amendment |
| **Disputes** | `GET /disputes/:id`<br>`POST /disputes`<br>`POST /disputes/:id/evidence`<br>`POST /disputes/:id/ai-summary` | `raiseDispute()`<br>`castVote()`<br>`finalizeDispute()` | 3-arbitrator pool median voting & advisory AI summaries |
| **Payments** | `GET /payments/agreement/:id` | `getPaymentSummary()` | Milestone payment ledger & protocol accounting invariants |
| **Clients Directory** | *Derived from `/agreements` & `/community/threads`* | N/A | Distinct counterparties, joint volume, and agreements together |
| **Analytics** | *Derived client-side from `/agreements`* | N/A | Delivery reliability rate, dispute frequency, and volume |
| **Admin Council** | `GET /config` | `addArbitrator()`<br>`removeArbitrator()`<br>`setOracle()`<br>`setTreasury()`<br>`setFeeBps()`<br>`pause()`/`unpause()` | Governance operations (contract owner only) |

---

## 🎨 Design System & Tokens

SANKALP's visual identity balances **80% Minimal Calm SaaS** (spacious padding, soft sage tones, clean typography) with **20% Subtle Neo-Brutalism** (bold headings, occasional dark ink borders, hard offset shadows on primary CTAs).

### Color Tokens (`tailwind.config.js`)
- `ivory` (`#F8F8F0`): Page background and canvas
- `sage` (`#E7EFE3`): Sidebar background, secondary containers, and badges
- `sage-light` (`#D2E2CD`): Completed milestones, success highlights, and active pills
- `forest` (`#263F32`): Active navigation background, dark feature cards, and brand accents
- `coral` (`#F28F7B`): Primary CTAs, offset shadows, important actions, and due-soon warnings
- `ink` (`#111713`): Headings, icons, and strong borders
- `white` (`#FFFFFF`): Elevated cards, form inputs, and modal dialogs
- `gray` (`#E6E8E2`): Dividers, secondary borders, and inactive progress tracks

### Status Color Mapping
- **Success / Approved / Paid**: Sage green (`bg-sage-light text-forest`)
- **Pending / Submitted / In Review**: Soft amber (`bg-[#FEF3C7] text-[#92400E]`)
- **Disputed / Rejected**: Muted coral (`bg-coral/25 text-ink border-coral/50`)
- **In Escrow / Funded**: Pale sage + forest text (`bg-sage-light text-forest font-semibold`)
- **Refunded**: Neutral gray with forest text (`bg-gray text-forest`)

### Typography
- **Headings**: `Space Grotesk` (600, 700)
- **Body UI**: `Inter` (400, 500)
- **Financial Figures**: `Inter` (600, 700) with `.tabular-nums`
- **Technical Metadata**: `IBM Plex Mono` (400, 500) used sparingly for hashes and addresses

### Design System Primitives (`src/components/ui/`)
1. `Button`: Primary coral with hard offset shadow (`shadow-brutal`), Secondary sage, Forest, Ghost, and Outline
2. `Card`: Minimalist elevated white card with 12-16px radius and subtle borders
3. `Badge`: Status badges strictly honoring the SANKALP status mapping
4. `Input`, `Textarea`, `Select`: Composed form inputs with focus rings
5. `ProgressBar`: Smooth progress tracks in forest or coral
6. `Skeleton`: Minimalist loading pulse components
7. `EmptyState`: Clean icon-driven empty placeholders
8. `Toast`: Notifications styled in sage, coral, and amber
9. `Tooltip`: Accessible contextual hover tooltips
10. `Modal`: Backdrop blurred dialog with neo-brutalist offset shadow
11. `Tabs`: Clean segmented controls with active forest pills
12. `TimelineItem`: Vertical connector with status dot, timestamps, and explorer links
13. `AddressChip`: Shortened address with copy-to-clipboard feedback and explorer link
14. `AmountDisplay`: MATIC primary currency display with optional secondary INR estimate
15. `CountdownTimer`: Tabular countdown with clock icons and coral warning alerts
16. `TxStatus`: Real-time transaction tracker distinguishing real on-chain confirmations from mock mode

---

## 📋 Data Gaps & Backend API Feedback (For Team Leader)

As requested, the frontend does not invent new backend endpoints and computes the **Clients** and **Analytics** pages client-side from existing responses. For future protocol optimization, we note the following observations:

1. **Clients Endpoint (`/clients` or `/counterparties`)**:
   - *Current Implementation*: Aggregated on the client by matching counterparties across `GET /agreements` and `GET /community/threads`.
   - *Recommendation*: An additive `GET /users/counterparties` endpoint returning distinct historical partners, total volume settled, and rating would reduce client-side mapping overhead.
2. **Aggregated Analytics Endpoint (`/analytics/summary`)**:
   - *Current Implementation*: On-time delivery rate, dispute frequency, and volume are computed client-side by filtering through agreements and milestone timestamps.
   - *Recommendation*: A dedicated `GET /analytics/my-performance` endpoint returning pre-calculated historical trends over 30/90 days would allow historical charts without loading all historical agreements into memory.

---

## 🧪 Testing

Run component and specification tests:
```bash
npm test
```
- `src/test/canonicalHash.test.js`: Verifies `canonicalHash` and recursive key-sorting against `shared/test-vectors/canonical-hash.json`.
- `src/test/termsToChain.test.js`: Verifies deterministic mapping from `AgreementTerms` JSON to EVM contract arguments.
