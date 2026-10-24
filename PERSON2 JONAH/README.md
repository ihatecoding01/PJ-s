# Dhruv — Backend (PERSON 2)

Hey team, here's my backend implementation for FairWork. All the backend code, models, and tests are inside the `backend/` directory.

### Quick Setup & Running

```bash
cd backend
npm install
copy .env.example .env
npm run prisma:push
npm run prisma:seed
npm run dev
```

The server runs on `http://localhost:4000`.

### Running Tests
To verify all 26 endpoints and flows:
```bash
npm test
```

### What's Built
- **Web3 Wallet Auth**: Nonce generation, signature verification with `ethers.verifyMessage`, and JWT issuance.
- **User Profiles**: Profile CRUD with roles, skills, bio, and GitHub handle.
- **Community**: Posts (jobs/services), proposals, negotiation threads, and chat messaging.
- **Agreement Drafting & Hashing**: AI draft generator from thread context, approval resets on edit, mutual approval locking, and deterministic canonical `keccak256` hashing.
- **Milestone Submission**: Repo analysis via AI, canonical report hashing, and on-chain progress recording via Oracle wallet.
- **Disputes & Safe Evidence**: Multi-part file upload with path traversal protection, SHA-256 evidence hashing, and AI arbitration recommendation.
- **Indexer & Timeline**: Contract event persistence and full agreement timeline view.
- **Payments & Deadlines**: Combined on-chain payment summary and background deadline alert watcher.

Full documentation, notes for each team member, and API details are in [`backend/README.md`](file:///c:/Users/dhruv/Downloads/thanda%20paani/PERSON2%20DHRUV/backend/README.md).
For testing requests directly, check [`backend/requests.http`](file:///c:/Users/dhruv/Downloads/thanda%20paani/PERSON2%20DHRUV/backend/requests.http).
