# FairWork - Backend (Dhruv / Person 2)

Hey team, this is the Express.js backend for our FairWork project. 

I've set this up using Node, TypeScript, Express, Prisma with SQLite, ethers.js for Web3 auth and hashing, and Zod for input validation.

Right now, both the blockchain and AI services are running on **mock mode** (`CHAIN_MOCK=true` and `AI_MOCK=true` in `.env`), so anyone (especially frontend) can run and test the full flow locally without needing a local blockchain node or AI server running.

---

## How to Run

Make sure you're in the `backend` folder:

```bash
cd backend
```

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Env
Copy the sample env:
```bash
copy .env.example .env
```
*(On Mac/Linux use `cp .env.example .env`)*

### 3. Database Setup (SQLite)
Push the Prisma schema to generate `dev.db`:
```bash
npm run prisma:push
```

Seed initial data (creates 3 users, 2 posts, 1 chat thread, and 1 agreement):
```bash
npm run prisma:seed
```

### 4. Run the Dev Server
```bash
npm run dev
```
The server will start on `http://localhost:4000`.

### 5. Run Tests
I wrote an end-to-end integration test suite checking all 26 endpoints:
```bash
npm test
```

---

## Notes for Team Members

- **For Suzan (Frontend / Person 4):**
  - CORS is already enabled for `http://localhost:5173`.
  - You can check `http://localhost:4000/health` to see if the server is alive.
  - Call `http://localhost:4000/config` on load to grab chain ID, contract address, oracle address, and ABI.
  - Check `requests.http` in this folder for exact JSON request & response payloads for every single endpoint.

- **For Yash (Smart Contracts / Person 1):**
  - I created a temporary ABI and deployment config in `src/contracts/FairWorkABI.json` and `src/contracts/deployment.json`.
  - Canonical terms hash uses `ethers.keccak256` over sorted JSON keys (`src/utils/canonicalHash.ts`).
  - When agreements are linked via `/agreements/:id/link`, it checks that the on-chain terms hash matches the local canonical hash.
  - When you deploy your contracts, update `CONTRACT_ADDRESS` in `.env` and set `CHAIN_MOCK=false`.

- **For Yashdeep (AI Service / Person 3):**
  - I added mock handlers in `src/adapters/aiAdapter.ts` for agreement drafting, repo milestone checks, and dispute arbitration.
  - When your FastAPI / Python AI service is up on port 8000, toggle `AI_MOCK=false` in `.env`.

---

## Tech Stack & Packages

- **Node.js + Express** with **TypeScript** (`tsx` for dev hot reload, `tsc` for building)
- **Prisma ORM** with **SQLite** (`dev.db`)
- **ethers.js (v6)**: used for:
  - `ethers.verifyMessage` for signature verification on login
  - `ethers.keccak256` for canonical agreement hashing
  - Oracle wallet milestone progress updates
- **jsonwebtoken**: for auth tokens (7 day expiry)
- **zod**: validates all request bodies
- **multer**: handles evidence uploads for disputes (saves in `uploads/` with hashed file names to prevent path traversal)
- **express-rate-limit**: rate limits the auth routes (100 req per 15 min)

---

## Endpoints Summary

### Public
- `GET /health` - Server status & mock status
- `GET /config` - Web3 config (chain ID, contract address, ABI)
- `POST /auth/nonce` - Get nonce for a wallet address
- `POST /auth/verify` - Submit signed message to get JWT token

### Protected (Send `Authorization: Bearer <token>`)

#### User Profiles
- `GET /auth/me` - Current logged in user
- `GET /users/profile` - User profile
- `PUT /users/profile` - Update bio, role (CLIENT/FREELANCER/BOTH), skills, githubUsername
- `GET /users` - List users
- `GET /users/:id` - Get user by ID

#### Community (Jobs & Services)
- `POST /community/posts` - Create job or service post
- `GET /community/posts` - Search posts (filter by `type`, `tag`, `status`, `query`)
- `GET /community/posts/:id` - Get post details and proposals
- `POST /community/posts/:id/proposals` - Submit a proposal
- `GET /community/posts/:id/proposals` - List proposals for a post
- `POST /community/threads` - Start a chat thread with another user
- `GET /community/threads` - List my chat threads
- `GET /community/threads/:id` - Get thread with message history
- `POST /community/threads/:id/messages` - Send a message in thread

#### Agreements
- `POST /agreements/draft` - Generate AI draft agreement from post & thread context
- `GET /agreements` - List my agreements
- `GET /agreements/:id` - Agreement details (milestones, events, disputes)
- `PUT /agreements/:id` - Edit draft terms (resets approvals back to DRAFT; cannot edit once LOCKED)
- `POST /agreements/:id/approve` - Approve agreement (when both client & freelancer approve, status locks and canonical hash is generated)
- `POST /agreements/:id/link` - Link on-chain contract agreement (verifies hash first)

#### Milestones
- `POST /milestones/:id/submit` - Freelancer submits repo URL & commit SHA (runs AI check, calculates canonical report hash, and records on chain via oracle)
- `POST /milestones/:id/review` - Client approves or rejects submitted milestone
- `GET /milestones/:id` - Milestone info & progress report

#### Disputes
- `POST /disputes` - Open a dispute on an agreement
- `GET /disputes/:id` - View dispute details
- `POST /disputes/:id/evidence` - Upload evidence file (calculates SHA256)
- `POST /disputes/:id/ai-summary` - Get AI summary and oracle recommendation
- `POST /disputes/:id/resolve` - Resolve dispute

#### Events, Payments & Alerts
- `POST /events/index/:id` - Backfill contract events
- `GET /events/timeline/:id` - Full chronological timeline of the agreement
- `GET /payments/agreement/:id` - Payment summary and payment event history
- `GET /alerts` - View active deadline alerts
- `POST /alerts/:id/resolve` - Resolve an alert

---

## Ready-to-Test HTTP File

If you're using VS Code REST Client extension, just open `requests.http` inside `backend/` and click **Send Request** on any endpoint.
