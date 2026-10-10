# FairWork Integration & Merge Log

This log meticulously documents every single change made during monorepo integration, detailing the affected file, exact changes, rationale, and owner to review.

| File | What Changed | Why | Which Member to Notify |
| :--- | :--- | :--- | :--- |
| `docs/COMMON_CONTEXT.md` | Created frozen specification document | Establish single source of truth across all 4 subprojects | All (Yash, Dhruv, Yashdeep, Suzan) |
| `docs/MERGE_LOG.md` | Initialized and maintained merge log | Audit every modification, rationale, and team notification | All |
| `shared/deployments/localhost.json` | Added `FairWork` contract address key alias alongside `address` | Ethers deploy scripts and frontend contract loaders query `deployment.FairWork \|\| deployment.address` | Yash, Dhruv, Suzan |
| `PERSON2 DHRUV/backend/src/adapters/aiAdapter.ts` | Rewrote AI adapter to invoke live FastAPI HTTP endpoints with `X-Internal-Key`, mapped clean domain errors (`GITHUB_RATE_LIMIT`, `GITHUB_NOT_FOUND`), added 30s timeouts, and enabled dual real/mock mode | Seam 2.4 specification compliance; eliminate hardcoded stubs when connecting live service | Dhruv, Yashdeep |
| `PERSON2 DHRUV/backend/src/adapters/chainAdapter.ts` | Aligned `recordProgress` parameter order to `(id, idx, progressBps, reportHash)` and added `recordAiRecommendation(id, idx, freelancerShareBps, reportHash)` | Exact signature parity with `FairWork.sol` smart contract interface and Seam 2.5 | Dhruv, Yash |
| `PERSON2 DHRUV/backend/src/modules/auth/auth.schema.ts` | Permitted both `address` and `walletAddress` in authentication request schemas | Seam 2.6 schema agreement; frontend sends `address`, backend originally expected `walletAddress` | Dhruv, Suzan |
| `PERSON2 DHRUV/backend/src/modules/auth/auth.controller.ts` | Added query parameter fallback `req.query.address` for `GET /auth/nonce` | Frontend authentication client requests nonces via query parameters | Dhruv, Suzan |
| `PERSON2 DHRUV/backend/src/app.ts` | Mounted `apiRouter` at both `/api` and root `/`, and added root alias for `/community` (`/posts`, `/threads`) | Resolve routing mismatches between frontend API clients expecting different path bases | Dhruv, Suzan |
| `PERSON2 DHRUV/backend/src/config/env.ts` | Added default fallback for `ORACLE_PRIVATE_KEY` (Hardhat Account #3) and `AI_INTERNAL_KEY` | Ensure reliable local bootstrap without missing configuration variables | Dhruv |
| `PERSON2 DHRUV/backend/.env` | Configured `AI_INTERNAL_KEY=fairwork_internal_secret_key`, `AI_SERVICE_URL=http://localhost:8000`, `ORACLE_PRIVATE_KEY` set to Hardhat Account #3 | Connect live AI service and fund registered oracle on-chain | Dhruv |
| `PERSON3 YASHDEEP/.env` | Added `AI_INTERNAL_KEY=fairwork_internal_secret_key` and standardized environment variables | Shared internal authentication key for FastAPI dependency verification | Yashdeep |
| `PERSON4 SUZAN/src/lib/latePenalty.js` | Changed `daysLate` calculation from `Math.ceil` to `Math.floor` | Match Solidity integer division truncation in `FairWork.sol::_calculateLatePenalty` and spec line 93 | Suzan, Yash |
| `PERSON2 DHRUV/backend/src/modules/agreements/agreement.schema.ts` | Supported flexible freelancer identifiers (`freelancerAddress`, `freelancerWallet`, and `freelancerId`) in `draftAgreementRequestSchema` | Eliminate Zod schema validation errors when client transmits wallet addresses | Dhruv |
| `PERSON2 DHRUV/backend/src/modules/agreements/agreement.service.ts` | Resolved freelancer wallet addresses to `User.id` CUIDs via checksummed lookup (`ethers.getAddress`), auto-created user if missing; added 404 status codes on not found errors; returned clean 400 on terms hash mismatch | Ensure SQLite foreign key integrity in Prisma, and guarantee clean error codes on `link-chain` failure | Dhruv |
| `PERSON2 DHRUV/backend/src/modules/community/community.schema.ts` | Enabled optional `type` defaulting to `'JOB'`, and allowed `budget` fallback via `budgetMax`/`budgetMin` | Support diverse community post creation payloads | Dhruv, Suzan |
| `PERSON2 DHRUV/backend/src/modules/community/community.service.ts` | Imported `ethers` and resolved `recipientId` wallet addresses to `User.id` CUIDs in `getOrCreateThread` | Prevent SQLite foreign key constraint violation during discussion thread creation | Dhruv |
| `shared/.env.example` | Consolidated the union of all environment variables across contracts, backend, AI service, and frontend | Seam 2.9 documentation parity | All |
| `package.json` | Created root monorepo package configuration with `install:all`, `chain`, `deploy`, `seed`, `setup`, `ai`, `backend`, `frontend`, `dev`, `test:all`, `e2e` scripts | Phase 3 single-command stack orchestration | All |
| `scripts/setup-demo.js` | Created automated post-deployment setup script registering Oracle (Account #3), Treasury (Account #4), 5 Arbitrators, and 1% fee | One-time post-deployment contract initialization for demo wallets | Yash, Dhruv |
| `scripts/dev-up.ps1` & `scripts/dev-up.sh` | Created automated startup scripts with sequential boot and health-check polling on ports 8545, 8000, 4000, and 5173 | Reliable local stack bootstrap on Windows and Unix systems | All |
| `scripts/test-canonical-hash.mjs` | Created verification script running 6 test vectors across JS, TS, and Python hashing implementations | Seam 2.2 validation proving 100% Keccak-256 hash parity | All |
| `scripts/test-schema-agreement.mjs` | Created schema validation script confirming Yashdeep (Pydantic), Dhruv (Zod), and Suzan (`termsToChain`) agree on valid and invalid terms | Seam 2.3 schema agreement verification | Yashdeep, Dhruv, Suzan |
| `scripts/e2e/test-scenarios.js` | Implemented end-to-end test suite for scenarios S1 through S12 using raw JSON-RPC nonces and EVM time travel | Phase 4 verification proving complete platform end-to-end functionality (12/12 passing) | All |
| `docs/COVERAGE.md` | Created comprehensive feature coverage matrix mapping requirements to files, endpoints, and tests | Phase 5 requirement | All |
| `README.md` | Wrote comprehensive root README with architecture diagram, quickstart, ports, demo accounts, and testing instructions | Phase 6 requirement | All |
| `docs/ARCHITECTURE.md` | Created detailed architectural documentation, sequence diagrams, and data flow specification | Phase 6 requirement | All |
| `docs/DEMO_SCRIPT.md` | Created 5-minute live demo presentation walkthrough | Phase 6 requirement | All |
| `docs/INTEGRATION_REPORT.md` | Created master integration report containing preflight, merge results, seam table, E2E results, coverage, review items, and risks | Final Phase 6 requirement | All |
