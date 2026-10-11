# SANKALP Demo Walkthrough & Evaluation Guide

> **Product**: SANKALP (Smart Agreements and Network for Key Achievements, Ledgers and Payments)  
> **Tagline**: *"Bridging Work and Trust"*  
> **Brand Persona**: Composed, secure, calm fintech SaaS (~80% Minimal SaaS + ~20% Subtle Neo-Brutalism)

This guide documents the full end-to-end user journey across all features and pages of the SANKALP frontend.

---

## 🧭 Flow 1: Landing Page & Nonce-Based Web3 Sign-in

1. **Spacious Fintech Landing**:
   - Navigate to `http://localhost:5173/`.
   - The landing page clearly presents the full title: **"Smart Agreements and Network for Key Achievements, Ledgers and Payments"** and tagline **"Bridging Work and Trust"**.
   - Review the three-step explainer (1. Draft & Bind Terms with AI, 2. Non-Custodial Escrow & Verification, 3. Instant Payouts & Fair Arbitration).
2. **Cryptographic Sign-In**:
   - Click the coral **"Connect Wallet"** button.
   - The modal allows connecting via MetaMask extension or switching between pre-funded Hardhat development personas (Alice Client, Bob Freelancer, Charlie Arbitrator).
   - In live mode, MetaMask requests a signature with the frozen SIWE format: `FairWork login: <nonce>`. Once verified, a JWT is stored and session begins.

---

## 📊 Flow 2: Composed Dashboard Overview

1. **Personalized Header & 4 Key Metric Cards**:
   - Personalized greeting ("Welcome back, Bob" or "Welcome back, Alice").
   - Four prominent cards:
     - **Active Projects**: Shows count of agreements currently in escrow.
     - **Pending Payments**: Shows locked MATIC balance with tabular numbers and secondary INR estimation.
     - **Completed Projects**: Shows successfully settled agreements.
     - **Open Disputes**: Displays pending arbitration disputes.
2. **Payment Overview & Dark Forest Promo Card**:
   - Inspect the interactive stacked payment bar: visual breakdown of Held in Escrow (Forest), Released (Sage), Disputed (Coral), and Refunded (Gray).
   - Beside it, the dark forest panel reads: **"YOUR WORK. PROTECTED."** highlighting non-custodial security.
3. **Upcoming Milestones**:
   - Cards display upcoming deliverable deadlines with real-time countdown timers.

---

## 💼 Flow 3: Community Projects & AI Agreement Generation

1. **Project Marketplace**:
   - Navigate to **Projects** via the fixed sage sidebar.
   - Search across job posts and filter by Jobs vs. Services.
   - Click **"+ New Project"** (prominent coral button with hard offset shadow) to open the create post modal.
2. **Negotiation Chat**:
   - Open a post and click **"Start Chat"** or visit **Messages** from the sidebar.
   - Exchange messages discussing deliverable scope and budget. The chat automatically polls every 5 seconds.
3. **AI Draft Generation**:
   - Click the coral **"Generate agreement with AI"** button.
   - The advisory AI drafts structured `AgreementTerms` JSON containing milestone tranches, deadlines, late penalty parameters, and acceptance criteria.

---

## 📝 Flow 4: Draft Review & Mutual Approval

1. **Inspecting Terms & AI Flags**:
   - Review title, description, GitHub repository target, and milestones.
   - Coral-tinted callouts highlight **AI Open Questions** and **Risk Warnings**.
2. **Mutual Sign-off**:
   - Both parties review the draft. If either party edits any term, notice the warning: *"Edits reset approvals"* to protect against scope creeping.
   - When both the Client and Freelancer approve, the agreement locks and advances to the On-Chain Wizard.

---

## ⚡ Flow 5: On-Chain Escrow Setup Wizard

1. **Verification of Keccak-256 Canonical Hash**:
   - The green badge displays: **"✓ Terms Verified On-Chain (Keccak-256 Match)"**, proving off-chain DB terms match the on-chain cryptographic commitment.
2. **Step 1 - Client Deploys (`createAgreement`)**:
   - Client clicks **"Create On-Chain"**. A plain-language summary modal explains the exact parameters and commitments before confirming in MetaMask.
3. **Step 2 - Freelancer Accepts (`acceptAgreement`)**:
   - Freelancer switches persona or account, views their next action prompt, and clicks **"Accept Agreement"**.
4. **Step 3 - Client Funds Escrow (`fundAgreement`)**:
   - Client deposits the exact total agreement budget in MATIC into the smart contract escrow.

---

## 🚀 Flow 6: Milestone Submission & Advisory AI Verification

1. **Freelancer Delivers Milestone**:
   - Freelancer opens the active agreement and clicks **"Submit Milestone"**.
   - Enters Git Commit SHA (e.g. `9f83a45c`), pull request link, and deliverable notes.
2. **Advisory AI Code Inspection**:
   - The advisory AI analyzes commits, lines of code, and acceptance criteria checklist.
   - Displays the **AI Progress Analysis Card** with progress bar, confidence score, and signals.
   - Prominently labeled: **"Advisory. The client decides."**
3. **Client Sign-off**:
   - Client can click **"Approve & Release Funds"** to trigger immediate on-chain settlement, or **"Reject Deliverable"** with an immutable reason hash.
   - **Review Window Auto-Claim**: If the client is silent throughout the review window, the freelancer's **"Claim Payment"** button unlocks.
   - **Late Penalty Preview**: Interactive calculator shows exact formula deductions: $\min(\text{daysLate} \times \text{bpsPerDay}, \text{maxLatePenaltyBps})$.

---

## ⚖️ Flow 7: Dispute Resolution & Arbitration Council

1. **Raising a Dispute**:
   - If deliverables cannot be reconciled, clicking **"Raise Dispute"** submits reason text and evidence.
2. **Arbitrator Pool Panel**:
   - Displays the 3 pseudo-randomly selected arbitrator addresses.
   - Arbitrators review the **Advisory AI Summary & Recommended Split**.
3. **Median Voting**:
   - Designated arbitrators use an interactive slider to vote on the `freelancerShareBps` (0% to 100%).
   - Once the voting window concludes, clicking **"Finalize Dispute"** calculates the median vote and executes the escrow payout on-chain.

---

## 💰 Flow 8: Financial Audit & Analytics

1. **Payments Ledger**:
   - Complete ledger verifies: $\text{locked} + \text{released} + \text{disputed} + \text{refunded} + \text{feesPaid} = \text{totalFunded}$.
   - Shows transaction explorer links and exact 100 bps protocol fees.
2. **Clients Directory**:
   - Derived counterparties, completed project history, and total transacted volume.
3. **Telemetry & Analytics**:
   - Client-side computed on-time completion rate and dispute frequency.
