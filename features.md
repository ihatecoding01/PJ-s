# SANKALP — Feature Catalog & Architecture Guide
**Smart Agreements and Network for Key Achievements, Ledgers and Payments**  
*Tagline: "Bridging Work and Trust"*

---

## 🏛️ Executive Summary

SANKALP is a decentralized, non-custodial milestone escrow and freelance agreement platform designed as a premium, calm fintech SaaS product. It bridges off-chain developer collaboration (Git commits, PRs, and AI negotiation) with deterministic on-chain smart contracts deployed on Ethereum/Polygon.

---

## 🌟 Comprehensive Feature Catalog

### 1. 📜 Canonical AI Agreement Synthesizer & Keccak-256 Binding
- **Description**: Natural language negotiations in community consultation threads are parsed by the Advisory AI engine into structured `AgreementTerms` JSON.
- **Cryptographic Binding**: Computes deterministic Keccak-256 canonical hash of sorted terms (`termsHash`). This hash is permanently recorded on-chain in `FairWork.sol`.
- **IPFS CID Generator**: Deterministically generates IPFS CIDv1 pointers (`ipfs://bafkrei...`) providing decentralized content-addressed verification.

### 2. 🖨️ Verifiable Legal Contract Certificate & PDF Exporter
- **Description**: Allows parties to view, print (`window.print()`), and download agreements as formal, legal certificate documents.
- **Certificate Properties**:
  - Unique SANKALP Certificate ID (e.g. `SANKALP-CERT-84DF6A71`)
  - Terms Hash (Keccak-256) seal & verification badge
  - Verified Client and Freelancer public addresses
  - Milestone schedule with deliverables, allocations, and deadlines
  - Dispute rules and arbitration terms
  - One-click raw terms JSON download for cold storage

### 3. 🛡️ Soulbound Reputation Tokens (ERC-5192 SBT)
- **Description**: Non-transferable on-chain proof of work achievement displayed on user profiles.
- **Reputation Badges**:
  - **Verified Escrow Veteran**: Awarded for completing 3+ multi-milestone escrows with 0 defaults.
  - **100% On-Time Delivery**: Awarded when all deliverables are submitted before grace windows.
  - **Dispute-Free Pioneer**: Awarded for maintaining 0% arbitration dispute escalation.
- **Verifiable Scorecard**: Tracks completed escrows, on-time rate %, and total settled volume.

### 4. 🌐 Interactive EVM Network Switcher & Faucet Connector
- **Description**: Quick 1-click network switcher in the top navigation bar.
- **Networks Supported**:
  - **Hardhat Local** (Chain ID: `31337`, Port: `8545`)
  - **Polygon Amoy Testnet** (Chain ID: `80002`)
- **MetaMask Integration**: Automatically dispatches `wallet_switchEthereumChain` and `wallet_addEthereumChain` if the network is not yet configured in MetaMask.
- **Faucet Link**: Direct link to the official Polygon Amoy Faucet to obtain testnet MATIC.

### 5. 🐙 GitHub Webhook & Deliverable Commit Explorer
- **Description**: Freelancers can browse recent Git commits or trigger a simulated live GitHub push webhook event.
- **Automated Inspection**: Captures commit SHAs, PR links, and executes the Advisory AI engine to produce an evidence-backed deliverable score (0-100%) before client review.

### 6. 💵 Multi-Currency Escrow (MATIC, USDC, USDT)
- **Description**: Agreements can be denominated in native MATIC or USD-pegged stablecoins (USDC / USDT).
- **Dual Valuation**: Shows both native cryptocurrency amounts and estimated fiat conversions (INR / USD) using the configurable platform rate.

### 7. ⚖️ Decentralized 3-Arbitrator Dispute Resolution
- **Description**: When milestones are disputed, funds are escrowed into a decentralized arbitration pool.
- **Mechanics**:
  - A 3-arbitrator peer pool casts independent votes on freelancer share percentage (`0% - 100%`).
  - The smart contract resolves the dispute using the **median of votes**, preventing extreme outliers from skewing the payout.
  - Fallback mechanisms invoke Advisory AI recommendations if fewer than 2 votes are cast before deadline.

### 8. ⏱️ Review Window Timers & Late Penalty Safeguards
- **Silence Auto-Claim**: If a client remains silent after milestone submission and the review window expires (e.g. 5 days), the freelancer can auto-claim approved funds.
- **Late Delivery Penalty**: Automatic daily basis-point penalty deducted from delayed deliverables (e.g. 100 bps/day up to a maximum cap), protecting client timelines.
- **Grace Window Reclaim**: If a freelancer misses deadline + grace window without submitting, the client can safely reclaim escrowed funds.

---

## 🔑 Demo Accounts Reference (Hardhat / Localhost 8545)

Connect MetaMask to `http://127.0.0.1:8545` (Chain ID `31337`) and import either account:

| Role | Wallet Address | Private Key | Balance |
| :--- | :--- | :--- | :--- |
| **Client** | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` | ~10,000 ETH |
| **Freelancer** | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` | ~10,000 ETH |
| **Deployer / Admin** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` | ~10,000 ETH |

---

## 🧪 Testing Verification Commands

Run all verification test suites from the project root:

```powershell
# 1. Smart Contracts Test Suite (12 passing tests)
npm run test:contracts

# 2. Advisory AI Engine Test Suite (30 passing tests)
npm run test:ai

# 3. Frontend Vitest Suite (11 passing tests)
npm run test:frontend

# 4. Cross-Persona Schema Seam Validator
npm run test:seams

# 5. Production Build Verification
npm --prefix "PERSON4 SUZAN" run build
```
