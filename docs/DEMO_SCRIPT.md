# FairWork 5-Minute Live Demo Script 🎬

Follow this step-by-step walkthrough to demonstrate the complete FairWork pipeline during live evaluations or hackathon presentations.

---

## ⏱️ Pre-Demo Setup (1 Minute)

1. Ensure the stack is running:
   ```powershell
   .\scripts\dev-up.ps1
   ```
2. Open your browser with MetaMask installed and point to `http://localhost:5173`.
3. Ensure MetaMask is connected to `Localhost 8545` (Chain ID `31337`).
4. Import the demo accounts using the private keys:
   - **Client Account**: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` (`0x7099...79C8`)
   - **Freelancer Account**: `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` (`0x3C44...93BC`)

---

## 🚀 Live Demo Walkthrough (4 Minutes)

### Step 1: Connect Wallet & Sign In (30 seconds)
1. In MetaMask, select the **Client Account**.
2. Click **Connect Wallet** in the top right of the FairWork web interface.
3. Sign the cryptographic authentication challenge: `"FairWork login: <nonce>"`.
4. Notice your wallet address appears in the top navigation bar with a verified green indicator.

### Step 2: Post a Project & Chat Negotiation (45 seconds)
1. Navigate to the **Community** tab.
2. Click **Post a Project**.
3. Fill in:
   - **Title**: `DeFi Yield Dashboard & Smart Contracts`
   - **Description**: `Need an escrow agreement platform with automated AI validation and milestone payouts.`
   - **Budget**: `1.5 MATIC`
   - **Tags**: `solidity, react, tailwind`
4. Click **Publish Post**.
5. Switch MetaMask to the **Freelancer Account** and connect.
6. Open the newly published post and click **Start Discussion / Propose Terms**.
7. Send a message proposing 2 milestones (0.5 MATIC for contracts, 1.0 MATIC for frontend).

### Step 3: AI Generates Standardized Agreement Terms (45 seconds)
1. Switch back to the **Client Account**.
2. Inside the chat discussion thread, click **Generate Agreement with AI**.
3. Watch the AI synthesize the chat conversation into structured `AgreementTerms` JSON:
   - Milestones partitioned with distinct deadlines and deliverables.
   - Default 1% platform fee and late penalty rules configured.
4. Click **Approve Draft** as the Client.
5. Switch to the **Freelancer Account** and click **Approve Draft**.
6. Observe the agreement status change to **LOCKED**, and the **Deterministic Canonical Hash** (`0x...`) is displayed.

### Step 4: Deploy On-Chain Escrow & Fund (60 seconds)
1. As the Client, click **Deploy Escrow Contract**.
2. MetaMask prompts to execute `createAgreement(...)`:
   - Inspect the transaction details: All terms, amounts (in wei), deadlines (in seconds), and criteria hashes are passed as strict typed arguments.
   - Click **Confirm**.
3. Switch to the Freelancer Account:
   - Click **Accept Agreement** (`acceptAgreement(...)` on-chain).
4. Switch back to the Client Account:
   - Click **Deposit & Fund Escrow** (`fundAgreement(...)` locking `1.5 MATIC`).
   - Observe the banner update: `"Terms verified on-chain"` with the live contract badge.

### Step 5: Deliver Milestone, GitHub AI Verification & Instant Payout (60 seconds)
1. Switch to the Freelancer Account:
   - Click **Submit Milestone 1**.
   - Input Commit SHA: `9f8e7d6c5b4a3f2e1d0c` and PR URL.
   - Click **Submit Deliverable**.
2. Observe the automated analysis:
   - The backend invokes the AI GitHub analyzer (`POST /ai/github/analyze`).
   - The AI inspects commit logs and verifies acceptance criteria.
   - The Oracle wallet signs and calls `recordProgress` on-chain.
   - The UI displays: **AI Progress Score: 95% (Verified)**.
3. Switch to the Client Account:
   - Click **Approve & Release Payment**.
   - Confirm the transaction in MetaMask.
4. Verify the Escrow Accounting:
   - Freelancer receives `0.495 MATIC` (0.5 MATIC minus 1% platform fee).
   - Treasury receives `0.005 MATIC` fee.
   - Timeline refreshes showing the complete immutable audit trail of events!

---

## 🏆 Key Talking Points for Judges
1. **Zero Escrow Deadlock**: If the client is unresponsive, the freelancer can auto-claim funds after the review window.
2. **Formulaic Protection**: Late submissions are docked automatically according to daily penalty basis points, protecting clients without subjective arguments.
3. **Multi-Party Arbitration**: If deliverables are rejected and disputed, 3 independent arbitrators cast fractional votes, executing median consensus with automated AI fallback.
4. **Immutable Audit Log**: Every single off-chain action and on-chain event is cryptographically indexed and rendered in a permanent timeline.
