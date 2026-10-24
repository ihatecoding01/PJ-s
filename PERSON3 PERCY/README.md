# FairWork AI Service (Person 3 — Yashdeep)

Stateless intelligence microservice powering **FairWork**, a decentralized freelance agreement platform with milestone-based escrow.

This service is consumed exclusively by the Node.js backend (**Person 2 — Dhruv**). It never interacts directly with the blockchain or database.

---

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Key Features](#key-features)
- [Environment Variables](#environment-variables)
- [Setup & Installation](#setup--installation)
- [API Endpoints & curl Examples](#api-endpoints--curl-examples)
  - [1. GET /health](#1-get-health)
  - [2. POST /ai/contract/draft](#2-post-aicontractdraft)
  - [3. POST /ai/contract/review](#3-post-aicontractreview)
  - [4. POST /ai/github/analyze](#4-post-aigithubanalyze)
  - [5. POST /ai/dispute/summary](#5-post-aidisputesummary)
- [Security & Prompt Injection Defense](#security--prompt-injection-defense)
- [Anti-Gaming Heuristics](#anti-gaming-heuristics)
- [Hybrid 40/60 Progress Scoring](#hybrid-4060-progress-scoring)
- [Evaluation Suite](#evaluation-suite)
- [Testing](#testing)
- [Additions & Schema Notes](#additions--schema-notes)

---

## Architecture Overview

```
                        +----------------------------+
                        |  Backend (P2 - Node.js)   |
                        +--------------+-------------+
                                       |
                REST API (JSON)        | Headers: X-Internal-Key
                Port 8000              v
+--------------------------------------------------------------------------+
|                  FairWork AI Service (P3 - Python 3.11)                   |
|                                                                          |
|  [Security Delimiter Sandbox] -> [Prompt Engine (prompts/*.md)]           |
|                                                                          |
|  [LLM Service]               [GitHub REST Service]     [Scoring Engine]   |
|  - OpenAI (GPT-4o)           - Commits, PRs, Checks    - 40% Deterministic|
|  - Anthropic (Claude 3.5)    - 5-Min Memory Cache      - 60% LLM Criteria |
|  - Canned MOCK mode          - Rate Limit Protection   - Anti-Gaming Guard|
|                                                                          |
|  [Deterministic Validators] -> Strictly enforces shared schema           |
+--------------------------------------------------------------------------+
```

---

## Key Features

1. **Day 1 Mock Mode (`MOCK=true`)**: Instant integration for P2 without requiring active LLM API keys or GitHub tokens.
2. **Deterministic Contract Validation**: Multi-stage validation enforcing exact decimal sums, strictly increasing future deadlines, single milestone for `LUMP_SUM`, sequential indexing (`0..n-1`), lowercase addresses, and platform defaults (`latePenaltyBpsPerDay=100`, `maxLatePenaltyBps=3000`, `reviewWindowDays=5`, `graceDays=3`, `maxRevisions=2`).
3. **Automated LLM Retry & Best-Effort Repair**: Automatically feeds validation errors back to the LLM (up to 2 retries) before falling back to deterministic best-effort repair.
4. **Hybrid 40/60 Code Analysis**: Evaluates repository progress using 40% deterministic signals (commits, PRs, meaningful diffs, CI test status, tags) and 60% LLM criteria verification against a compact repository digest.
5. **Anti-Gaming Detection**: Proactively flags whitespace/comment-only diffs, deadline commit dumps, forked repos, unverified commits, missing test suites, and vendored code dominance.
6. **Robust Prompt Injection Sandboxing**: Wraps untrusted text in XML delimiters (`<untrusted_input>`), neutralizes breakout payloads, and instructs models to treat untrusted text strictly as passive data.
7. **Canonical Hashing Helper**: Pure Python Ethereum Keccak-256 implementation matching `web3.keccak` and canonical JSON formatting (`0x...`).

---

## Environment Variables

| Variable | Type | Default | Description |
|---|---|---|---|
| `PORT` | int | `8000` | Port on which FastAPI listens |
| `HOST` | string | `0.0.0.0` | Host binding interface |
| `MOCK` | boolean | `false` | When `true`, returns instant schema-valid canned responses |
| `LLM_PROVIDER` | string | `openai` | LLM provider: `openai` or `anthropic` |
| `LLM_API_KEY` | string | `""` | API key for OpenAI or Anthropic |
| `LLM_MODEL` | string | `""` | Optional model override (e.g. `gpt-4o`, `claude-3-5-sonnet-20241022`) |
| `GITHUB_TOKEN` | string | `""` | GitHub Personal Access Token (for private repos & 5000 req/hr) |
| `AI_INTERNAL_KEY` | string | `""` | Optional secret key; enforces `X-Internal-Key` header if set |
| `GITHUB_CACHE_TTL_SECONDS` | int | `300` | In-memory cache duration for GitHub API responses |

---

## Setup & Installation

### Local Setup
```bash
# 1. Navigate to service folder
cd "PERSON3 YASHDEEP"

# 2. Create virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env

# 5. Start development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Docker Setup
```bash
docker build -t fairwork-ai-service .
docker run -p 8000:8000 --env-file .env fairwork-ai-service
```

---

## API Endpoints & curl Examples

Base URL: `http://localhost:8000`

### 1. GET /health
Health check endpoint reporting service status, version, and active provider.

```bash
curl -X GET http://localhost:8000/health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "fairwork-ai-service",
  "version": "1.0.0",
  "mock": true,
  "provider": "mock"
}
```

---

### 2. POST /ai/contract/draft
Extracts structured `AgreementTerms` JSON matching `shared/schema/agreement-terms.json` from chat messages and community post context.

```bash
curl -X POST http://localhost:8000/ai/contract/draft \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: your_internal_secret_key_here" \
  -d '{
    "thread_messages": [
      {
        "sender": "0x1111111111111111111111111111111111111111",
        "text": "Can you build the backend escrow and AI service? Budget is 2.0 MATIC.",
        "ts": "2026-10-10T12:00:00Z"
      },
      {
        "sender": "0x2222222222222222222222222222222222222222",
        "text": "Yes! Milestone 1: Contracts for 1.0 MATIC due Nov 1. Milestone 2: FastAPI service for 1.0 MATIC due Nov 15.",
        "ts": "2026-10-10T12:05:00Z"
      }
    ],
    "post_context": "Decentralized Escrow Platform Development",
    "parties": {
      "client": "0x1111111111111111111111111111111111111111",
      "freelancer": "0x2222222222222222222222222222222222222222"
    }
  }'
```

**Response (200 OK):**
```json
{
  "terms": {
    "schemaVersion": "1.0",
    "title": "Decentralized Escrow Platform Development",
    "description": "Full-stack development of milestone-based freelance escrow with GitHub integration.",
    "client": "0x1111111111111111111111111111111111111111",
    "freelancer": "0x2222222222222222222222222222222222222222",
    "currency": "MATIC",
    "totalAmount": "2.0",
    "paymentMode": "MILESTONE",
    "latePenaltyBpsPerDay": 100,
    "maxLatePenaltyBps": 3000,
    "reviewWindowDays": 5,
    "graceDays": 3,
    "maxRevisions": 2,
    "github": {
      "repoUrl": "https://github.com/fairwork-test/escrow-demo",
      "branch": "main"
    },
    "milestones": [
      {
        "index": 0,
        "title": "Milestone 1: Smart Contracts and Testing",
        "description": "Develop FairWork core escrow contracts with Hardhat tests passing.",
        "amount": "1.0",
        "deadline": "2026-11-01T00:00:00Z",
        "requiredProgressBps": 8000,
        "acceptanceCriteria": [
          "Solidity smart contracts FairWork.sol compiles with zero warnings",
          "Hardhat test suite achieves >= 90% test coverage"
        ]
      },
      {
        "index": 1,
        "title": "Milestone 2: Backend API & AI Service Integration",
        "description": "FastAPI service with GitHub analyzer and contract drafting endpoints.",
        "amount": "1.0",
        "deadline": "2026-11-15T00:00:00Z",
        "requiredProgressBps": 8500,
        "acceptanceCriteria": [
          "FastAPI endpoints /ai/contract/draft and /ai/github/analyze implemented",
          "Automated pytest suite passing with GitHub fixture tests"
        ]
      }
    ],
    "createdAt": "2026-10-10T12:05:00Z"
  },
  "open_questions": [
    "Please confirm GitHub repository URL before locking funds on-chain."
  ],
  "warnings": [
    "latePenaltyBpsPerDay was assumed default (100 bps / 1% per day).",
    "reviewWindowDays was assumed default (5 days)."
  ]
}
```

---

### 3. POST /ai/contract/review
Audits `AgreementTerms` for fairness, risk distribution, penalty harshness, and clarity.

```bash
curl -X POST http://localhost:8000/ai/contract/review \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: your_internal_secret_key_here" \
  -d '{
    "terms": {
      "schemaVersion": "1.0",
      "title": "Escrow Development",
      "description": "Build escrow",
      "client": "0x1111111111111111111111111111111111111111",
      "freelancer": "0x2222222222222222222222222222222222222222",
      "currency": "MATIC",
      "totalAmount": "1.0",
      "paymentMode": "MILESTONE",
      "latePenaltyBpsPerDay": 600,
      "maxLatePenaltyBps": 6000,
      "reviewWindowDays": 2,
      "graceDays": 3,
      "maxRevisions": 2,
      "github": {"repoUrl": "https://github.com/org/repo", "branch": "main"},
      "milestones": [
        {
          "index": 0,
          "title": "Full delivery",
          "description": "All work",
          "amount": "1.0",
          "deadline": "2026-11-01T00:00:00Z",
          "requiredProgressBps": 8000,
          "acceptanceCriteria": ["Make the code look nice"]
        }
      ],
      "createdAt": "2026-10-10T12:00:00Z"
    }
  }'
```

**Response (200 OK):**
```json
{
  "fairness_score": 58,
  "flags": [
    {
      "clause": "latePenaltyBpsPerDay",
      "issue": "Daily late penalty rate (600 bps / 6.0% per day) is unusually harsh.",
      "suggestion": "Cap daily penalty at 100-200 bps (1-2% per day)."
    },
    {
      "clause": "maxLatePenaltyBps",
      "issue": "Maximum penalty cap (6000 bps / 60.0%) allows forfeiture of more than half the agreement value.",
      "suggestion": "Cap maximum cumulative penalty at 2000-3000 bps (20-30%)."
    },
    {
      "clause": "milestones",
      "issue": "Payment mode is set to MILESTONE but contains only a single large milestone.",
      "suggestion": "Break the project into at least 2-3 discrete milestones to reduce counterparty risk."
    },
    {
      "clause": "milestones[0].acceptanceCriteria",
      "issue": "Criterion 'Make the code look nice' contains subjective phrasing ('nice looking').",
      "suggestion": "Replace with measurable criteria, such as passing test suites or concrete endpoint contracts."
    }
  ]
}
```

---

### 4. POST /ai/github/analyze
Evaluates repository progress using hybrid deterministic signal collection + LLM acceptance criteria verification.

```bash
curl -X POST http://localhost:8000/ai/github/analyze \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: your_internal_secret_key_here" \
  -d '{
    "repo_url": "https://github.com/fairwork-test/escrow-demo",
    "branch": "main",
    "since": "2026-10-01T00:00:00Z",
    "until": "2026-10-10T00:00:00Z",
    "commit_sha": "a1b2c3d4e5f6",
    "milestone": {
      "title": "Smart Contracts and Testing",
      "description": "Develop FairWork core escrow contracts with Hardhat tests passing.",
      "acceptance_criteria": [
        "Solidity smart contracts FairWork.sol compiles with zero warnings",
        "Hardhat test suite achieves >= 90% test coverage"
      ],
      "required_progress_bps": 8000
    }
  }'
```

**Response (200 OK):**
```json
{
  "progress_bps": 8750,
  "confidence": 0.92,
  "signals": {
    "commits": 14,
    "prs_merged": 2,
    "files_changed": 18,
    "lines_added": 1420,
    "tests_status": "passing",
    "release_tag": "v0.1.0",
    "contributors": [
      "developer-alice",
      "contributor-bob"
    ]
  },
  "criteria_results": [
    {
      "criterion": "Solidity smart contracts FairWork.sol compiles with zero warnings",
      "met": true,
      "evidence": "Verified in commit a1b2c3d4 via test suite and file tree inspection."
    },
    {
      "criterion": "Hardhat test suite achieves >= 90% test coverage",
      "met": true,
      "evidence": "Verified in commit a1b2c3d4 via test suite and file tree inspection."
    }
  ],
  "summary": "Milestone implementation verified successfully. All core criteria have passing tests and active PR merges.",
  "risks": [
    "No high-severity gaming anomalies detected. Normal commit distribution observed."
  ]
}
```

---

### 5. POST /ai/dispute/summary
Generates a neutral arbitration summary, argument comparison, and advisory basis-point payout recommendation.

```bash
curl -X POST http://localhost:8000/ai/dispute/summary \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: your_internal_secret_key_here" \
  -d '{
    "terms": {
      "schemaVersion": "1.0",
      "title": "Escrow Development",
      "totalAmount": "2.0",
      "client": "0x1111111111111111111111111111111111111111",
      "freelancer": "0x2222222222222222222222222222222222222222",
      "currency": "MATIC",
      "paymentMode": "MILESTONE",
      "github": {"repoUrl": "https://github.com/org/repo", "branch": "main"},
      "milestones": [
        {
          "index": 0,
          "title": "Contracts",
          "amount": "1.0",
          "deadline": "2026-11-01T00:00:00Z",
          "acceptanceCriteria": ["Contracts compile", "Tests pass"]
        }
      ]
    },
    "milestone": {
      "index": 0,
      "title": "Contracts",
      "amount": "1.0",
      "deadline": "2026-11-01T00:00:00Z",
      "acceptanceCriteria": ["Contracts compile", "Tests pass"]
    },
    "submission": {
      "commit_sha": "a1b2c3d4",
      "notes": "Delivered all contracts with passing tests."
    },
    "rejection_reason": "Missing integration test suite for Polygon Amoy.",
    "github_report": {
      "progress_bps": 8000,
      "signals": {"tests_status": "passing", "commits": 10}
    },
    "evidence": [
      "Freelancer: All local tests pass with 95% coverage per commit a1b2c3d4.",
      "Client: The test suite lacks Amoy testnet deployment scripts."
    ]
  }'
```

**Response (200 OK):**
```json
{
  "summary": "Neutral Dispute Assessment: The freelancer submitted the deliverables on time with passing unit tests. The client expressed concerns regarding edge case validation. Review of the GitHub report indicates that 80% of milestone scope was completed in good faith with verifiable commits.",
  "recommended_freelancer_share_bps": 7500,
  "reasoning": "Advisory recommendation: 7500 bps (75%) payout to freelancer, 2500 bps (25%) refund to client. Evidence confirms substantial completion of primary endpoints and schemas. However, minor secondary criteria lacked end-to-end integration tests as noted in client evidence."
}
```

---

## Security & Prompt Injection Defense

1. **Untrusted Sandboxing**: External strings (chat messages, evidence, code diffs, READMEs) are enclosed in `<untrusted_input source="...">...</untrusted_input>` blocks.
2. **Tag Neutralization**: Any embedded closing tags (`</untrusted_input>`) inside user input are sanitized to `<\\/untrusted_input>` to prevent container breakouts.
3. **Prompt Hardening**: System instructions explicitly forbid untrusted content from overriding output JSON schemas, altering basis point shares, or executing commands.
4. **Header Authentication**: If `AI_INTERNAL_KEY` is configured, all requests require matching `X-Internal-Key` header, returning HTTP 401 with `{"error": {"code": "UNAUTHORIZED", "message": "..."}}` if absent or invalid.
5. **No Secret Logging**: API keys and tokens are never printed to console logs or error messages.

---

## Anti-Gaming Heuristics

The service inspects code diffs and commit patterns for deceptive behavior:
- **Whitespace / Comment Only Diffs**: Penalizes diffs where additions consist primarily of comments or whitespace.
- **Commit Dumps**: Flags situations where >80% of commits were pushed in the final 5% of the deadline window.
- **Vendored File Inflation**: Detects when >70% of line changes come from `node_modules/`, `package-lock.json`, or minified files.
- **Missing Tests**: Lowers confidence when no test files (`test/`, `spec/`, `*.test.*`) or CI test suites are present.
- **Forked Repositories**: Flags repositories marked as forks to ensure originality.
- **Missing Commit SHA**: Lowers confidence and applies a deterministic penalty if a submitted commit SHA is missing from the branch history.

---

## Hybrid 40/60 Progress Scoring

Progress basis points (`progress_bps`, 0 to 10000) are computed via a weighted hybrid:

$$\text{progress\_bps} = \text{Deterministic Score (up to 4000 bps)} + \text{Criteria Score (up to 6000 bps)}$$

- **Deterministic Score (max 4000 bps)**:
  - Commits cadence (up to 1000 bps)
  - Meaningful lines added (up to 1000 bps)
  - Merged Pull Requests (up to 800 bps)
  - CI test status (passing: +800, none: +300, failing: -400)
  - Release tag (up to 400 bps)
  - Subtraction of anti-gaming penalties
- **Criteria Score (max 6000 bps)**:
  - $\frac{\text{met criteria}}{\text{total criteria}} \times 6000$ bps
- **Confidence Score (0.0 to 1.0)**:
  - Base: `0.95`, adjusted downwards by detected gaming anomalies, missing tests, or truncated diffs.

---

## Evaluation Suite

The `eval/` directory contains sample chat threads and repository signals:
- `eval/threads/thread_1_saas_mvp.json` (2 milestones)
- `eval/threads/thread_2_solidity_escrow.json` (3 milestones)
- `eval/threads/thread_3_lump_sum_landing_page.json` (LUMP_SUM single milestone)
- `eval/repos/repo_1_solid_progress.json` (Healthy repo)
- `eval/repos/repo_2_gaming_dump.json` (Deceptive commit dump)
- `eval/repos/repo_3_partial_ci_failed.json` (Partial progress with broken CI)
- `eval/expected_outputs/` (Baseline expected outputs)

Run the evaluation runner:
```bash
python eval/run_eval.py
```

---

## Testing

Run the full pytest suite (30 comprehensive tests):
```bash
python -m pytest
```

Tests include:
- `tests/test_validators.py`: Strict schema math, deadline sorting, LUMP_SUM enforcement, lowercase address normalization.
- `tests/test_scoring.py`: 40/60 hybrid weighting, CI penalties, criteria fractions.
- `tests/test_json_repair.py`: Markdown code fence stripping, trailing comma repair.
- `tests/test_prompt_injection.py`: 3 prompt injection test cases verifying sandbox containment.
- `tests/test_github_fixtures.py`: 2 recorded offline GitHub fixtures (healthy progress vs gaming dump).
- `tests/test_endpoints_mock.py`: End-to-end endpoint tests in mock mode with error formatting.

---

## Additions & Schema Notes

All endpoint schemas match the Common Context specification:
- `GithubSignals`: contains `commits`, `prs_merged`, `files_changed`, `lines_added`, `tests_status`, `release_tag`, `contributors`.
- Error Responses strictly follow `{"error": {"code": "STRING", "message": "text"}}`.
- No required fields were modified or removed.
