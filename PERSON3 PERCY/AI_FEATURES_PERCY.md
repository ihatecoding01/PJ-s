# SANKALP — AI Engineering Roadmap (Person 3: Percy)
**Role: AI Person 1 (AI Microservice Lead)**  
**Workspace Directory:** `PERSON3 PERCY/`  
**Service:** FastAPI Intelligence Engine (Port: `8000`)

---

## 📋 Overview of Assigned Features

Percy is responsible for building **4 end-to-end features** centered around **Scoping, Contract Auditing, Multimodal Deliverable Inspection, and Dispute Arbitration Intelligence**:

1. **Feature 1: Brief-to-Plan Generator** (Autonomous Goal Decomposition)
2. **Feature 2: Agreement Clarity Linter & Pre-Lock Risk Auditor** (1-Click Measurable Rewrites)
3. **Feature 3: Non-Code & Multimodal Deliverable Verifier** (Figma, PDFs & UI Screenshots)
4. **Feature 4: AI Arbitrator Dossier & Evidence Cross-Examiner** (Per-Criterion Dispute Matrix)

---

## 🛠️ Feature 1: Brief-to-Plan Generator (Autonomous Goal Decomposition)

### 1.1 The Feature
Today, agreements in SANKALP can only be drafted after users engage in back-and-forth negotiation in [ChatPage.jsx](file:///c:/Users/perci/Desktop/college/AI/PJ-s/PERSON4%20SUZAN/src/pages/ChatPage.jsx). The **Brief-to-Plan Generator** allows a client to provide a simple, 2-to-3 sentence project brief (e.g., *"Build an on-chain tipping dApp with Twitter login and Polygon smart contract payout with automated test suites"*). 

The AI autonomously synthesizes:
- Project title & clear architectural description
- Logical milestone decomposition (sequential delivery phases)
- Fair budget allocation per milestone (must sum to total budget)
- Realistic sequential deadlines
- **Objectively verifiable acceptance criteria** tailored for code or architecture verification

### 1.2 Files to Create / Modify
| Action | File Path | Description |
|:---|:---|:---|
| **CREATE** | `PERSON3 PERCY/prompts/plan_generator.md` | LLM system prompt for goal decomposition |
| **CREATE** | `PERSON3 PERCY/app/models/plan.py` | Pydantic request & response schemas |
| **MODIFY** | `PERSON3 PERCY/app/routers/draft.py` | Add endpoint `POST /ai/contract/plan-from-brief` |
| **MODIFY** | `PERSON3 PERCY/app/services/mock_data.py` | Add deterministic mock response for testing |
| **MODIFY** | `PERSON2 JONAH/backend/src/adapters/aiAdapter.ts` | Add `planFromBrief()` backend caller |
| **MODIFY** | `PERSON2 JONAH/backend/src/modules/agreements/agreement.routes.ts` | Route `POST /api/agreements/plan-from-brief` |
| **MODIFY** | `PERSON4 SUZAN/src/pages/DraftPage.jsx` | Add "Generate from Brief" button & modal |

### 1.3 Step-by-Step Implementation

#### Step 1: Create `PERSON3 PERCY/prompts/plan_generator.md`
```markdown
# Brief-to-Plan System Prompt

You are an expert technical product architect for FairWork.
Given a high-level project goal or client brief, decompose the project into a structured, milestone-based delivery plan.

## DECOMPOSITION RULES:
1. Divide the project into 2 to 4 sequential milestones.
2. Ensure milestone amounts sum EXACTLY to the specified total budget.
3. Set sequential deadlines (e.g. Day 7, Day 14, Day 21).
4. For each milestone, provide 2 to 4 CONCRETE, OBJECTIVELY VERIFIABLE acceptance criteria.
5. Never use vague phrases like "clean code", "good UI", or "high performance".

## OUTPUT FORMAT (Return JSON only):
{
  "title": "Project Title",
  "description": "Comprehensive scope overview...",
  "currency": "ETH",
  "totalAmount": "1.5",
  "milestones": [
    {
      "index": 0,
      "title": "Phase 1: Architecture & Data Layer",
      "description": "Database schema, smart contracts, and auth endpoints",
      "amount": "0.6",
      "deadlineDays": 7,
      "acceptanceCriteria": [
        "User schema migrations run with zero errors",
        "POST /api/auth/verify endpoint passes unit test suite"
      ]
    }
  ]
}
```

#### Step 2: Create `PERSON3 PERCY/app/models/plan.py`
```python
from pydantic import BaseModel, Field
from typing import List, Optional

class PlanFromBriefRequest(BaseModel):
    brief: str = Field(..., min_length=10, description="Client natural language brief")
    total_budget: Optional[float] = Field(default=1.0, gt=0)
    currency: Optional[str] = Field(default="ETH")
    client_address: Optional[str] = Field(default="0x1111111111111111111111111111111111111111")
    freelancer_address: Optional[str] = Field(default="0x2222222222222222222222222222222222222222")

class GeneratedMilestone(BaseModel):
    index: int
    title: str
    description: str
    amount: str
    deadline_days: int
    acceptanceCriteria: List[str]

class PlanFromBriefResponse(BaseModel):
    title: str
    description: str
    totalAmount: str
    currency: str
    milestones: List[GeneratedMilestone]
```

#### Step 3: Add Router Endpoint in `PERSON3 PERCY/app/routers/draft.py`
```python
from app.models.plan import PlanFromBriefRequest, PlanFromBriefResponse

@router.post("/ai/contract/plan-from-brief", response_model=PlanFromBriefResponse, dependencies=[Depends(verify_internal_key)])
async def generate_plan_from_brief(request: PlanFromBriefRequest) -> PlanFromBriefResponse:
    if settings.MOCK or not settings.LLM_API_KEY:
        return get_mock_plan_from_brief(request)
    
    system_prompt = load_prompt_template("plan_generator.md")
    user_prompt = f"CLIENT BRIEF: {request.brief}\nBUDGET: {request.total_budget} {request.currency}"
    
    result = await llm_service.call_llm_json_with_retry(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_retries=2
    )
    return PlanFromBriefResponse.model_validate(result)
```

### 1.4 How to Test Feature 1
```bash
# 1. Test via curl on port 8000
curl -X POST http://localhost:8000/ai/contract/plan-from-brief \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: fairwork_internal_secret_key" \
  -d '{
    "brief": "Develop a decentralized voting dApp on Polygon with MetaMask login and live result charts.",
    "total_budget": 2.5,
    "currency": "MATIC"
  }'
```
**Expected Output:** JSON containing `title`, `totalAmount: "2.5"`, and sequential milestones with concrete testable acceptance criteria.

---

## 🛡️ Feature 2: Agreement Clarity Linter & Pre-Lock Risk Auditor

### 2.1 The Feature
Before locking real cryptocurrency into the `FairWork.sol` escrow, both parties should know if the agreement is balanced and free of dispute-causing ambiguities. 
The **Clarity Linter**:
- Parses all acceptance criteria across all milestones.
- Flags vague clauses (e.g., *"Make animations smooth"*, *"High security"*, *"Deliver quickly"*).
- Detects one-sided terms (late penalties >5%/day, front-loaded payouts >70% in Phase 1).
- Generates a **0–100 Clarity & Fairness Score**.
- Provides **1-Click Auto-Rewrites** to replace subjective words with measurable metrics.

### 2.2 Files to Create / Modify
| Action | File Path | Description |
|:---|:---|:---|
| **MODIFY** | `PERSON3 PERCY/prompts/contract_review.md` | Enhance with 1-click suggested rewrites |
| **MODIFY** | `PERSON3 PERCY/app/routers/review.py` | Add rewrite generator to flags |
| **MODIFY** | `PERSON3 PERCY/app/models/review.py` | Add `suggested_rewrite` field to `ReviewFlag` |
| **MODIFY** | `PERSON2 JONAH/backend/src/modules/agreements/agreement.controller.ts` | Expose `POST /api/agreements/:id/audit` |
| **MODIFY** | `PERSON4 SUZAN/src/pages/DraftPage.jsx` | Add "Audit Agreement" side-drawer & 1-click replace buttons |

### 2.3 Step-by-Step Implementation

#### Step 1: Update `PERSON3 PERCY/app/models/review.py`
```python
class ReviewFlag(BaseModel):
    clause: str
    issue: str
    suggestion: str
    suggested_rewrite: Optional[str] = None  # Exact drop-in text replacement
    severity: str = "WARNING"  # INFO, WARNING, CRITICAL
```

#### Step 2: Update `PERSON3 PERCY/app/routers/review.py`
In `perform_deterministic_review()`:
```python
# Check for vague phrasing with concrete rewrites
vague_dict = {
    "smooth": "maintains 60fps frame rate without noticeable stutter",
    "clean code": "passes ESLint/Pylint with zero errors and TypeScript strict mode enabled",
    "fast": "p95 API response time stays under 250ms under a 50 concurrent user benchmark",
    "high quality": "achieves >80% automated unit test branch coverage",
    "nice ui": "implements responsive layout supporting 375px mobile and 1440px desktop breakpoints"
}

for idx, m in enumerate(milestones):
    for c_idx, c in enumerate(m.get("acceptanceCriteria", [])):
        lower_c = str(c).lower()
        for vague_word, rewrite_phrase in vague_dict.items():
            if vague_word in lower_c:
                flags.append(ReviewFlag(
                    clause=f"milestones[{idx}].acceptanceCriteria[{c_idx}]",
                    issue=f"Subjective phrasing detected: '{vague_word}'.",
                    suggestion=f"Replace with measurable objective criteria.",
                    suggested_rewrite=str(c).replace(vague_word, rewrite_phrase),
                    severity="WARNING"
                ))
```

### 2.4 How to Test Feature 2
```bash
curl -X POST http://localhost:8000/ai/contract/review \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: fairwork_internal_secret_key" \
  -d '{
    "terms": {
      "schemaVersion": "1.0",
      "title": "Website Design",
      "description": "Design test",
      "client": "0x1111111111111111111111111111111111111111",
      "freelancer": "0x2222222222222222222222222222222222222222",
      "currency": "ETH",
      "totalAmount": "1.0",
      "paymentMode": "MILESTONE",
      "latePenaltyBpsPerDay": 600,
      "maxLatePenaltyBps": 6000,
      "reviewWindowDays": 5,
      "graceDays": 3,
      "maxRevisions": 2,
      "github": {"repoUrl": "https://github.com/example/repo", "branch": "main"},
      "milestones": [
        {
          "index": 0,
          "title": "Frontend",
          "description": "Build UI",
          "amount": "1.0",
          "deadline": "2026-11-01T00:00:00Z",
          "requiredProgressBps": 8000,
          "acceptanceCriteria": ["Make clean code and nice UI"]
        }
      ]
    }
  }'
```
**Expected Output:** `fairness_score < 70`, with flags detailing `suggested_rewrite` replacing *"clean code"* and *"nice UI"*, plus penalty rate warnings.

---

## 🎨 Feature 3: Non-Code & Multimodal Deliverable Verifier

### 3.1 The Feature
Currently, SANKALP’s [github.py](file:///c:/Users/perci/Desktop/college/AI/PJ-s/PERSON3%20PERCY/app/routers/github.py) only checks Git commits and code diffs. This locks out designers, UI/UX writers, and consultants.
The **Multimodal Deliverable Verifier**:
- Accepts Figma links, live website URLs, document text, or image screenshot paths.
- Compares deliverable contents against each milestone acceptance criterion.
- Returns an objective 4-state verdict for each criterion:
  1. `SUPPORTED` (Conclusive evidence found)
  2. `UNCLEAR` (Partial evidence, requires manual confirmation)
  3. `NOT_DEMONSTRATED` (Criterion missing in submitted asset)
  4. `CHECK_FAILED` (Contradicts requirements)
- Generates an overall advisory basis-point progress score ($0 - 10,000$).

### 3.2 Files to Create / Modify
| Action | File Path | Description |
|:---|:---|:---|
| **CREATE** | `PERSON3 PERCY/prompts/multimodal_review.md` | Multimodal prompt for deliverable auditing |
| **CREATE** | `PERSON3 PERCY/app/models/multimodal.py` | Request/Response schemas |
| **CREATE** | `PERSON3 PERCY/app/routers/multimodal.py` | Endpoint `POST /ai/deliverable/verify-multimodal` |
| **MODIFY** | `PERSON3 PERCY/app/main.py` | Register multimodal router |
| **MODIFY** | `PERSON2 JONAH/backend/src/modules/milestones/milestone.controller.ts` | Support non-code milestone submission |
| **MODIFY** | `PERSON4 SUZAN/src/components/dashboard/SubmitMilestoneModal.jsx` | Add "File/Design Link" submission tab |

### 3.3 Step-by-Step Implementation

#### Step 1: Create `PERSON3 PERCY/app/models/multimodal.py`
```python
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

class VerdictEnum(str, Enum):
    SUPPORTED = "SUPPORTED"
    UNCLEAR = "UNCLEAR"
    NOT_DEMONSTRATED = "NOT_DEMONSTRATED"
    CHECK_FAILED = "CHECK_FAILED"

class CriterionVerdict(BaseModel):
    criterion: str
    verdict: VerdictEnum
    evidence: str

class MultimodalVerifyRequest(BaseModel):
    deliverable_type: str = Field(..., description="'DESIGN', 'DOCUMENT', or 'URL'")
    deliverable_content: str = Field(..., description="Text summary, image base64, or URL")
    milestone_title: str
    acceptance_criteria: List[str]

class MultimodalVerifyResponse(BaseModel):
    overall_progress_bps: int
    quality_score: int
    summary: str
    criteria_verdicts: List[CriterionVerdict]
```

#### Step 2: Create `PERSON3 PERCY/prompts/multimodal_review.md`
```markdown
# Multimodal Deliverable Verification Prompt

You are an expert design and deliverable quality auditor for FairWork.
Evaluate the submitted non-code deliverable against each acceptance criterion.

For each criterion, assign exactly one verdict:
- SUPPORTED: Verifiable evidence exists in the submission.
- UNCLEAR: Ambiguous or incomplete evidence.
- NOT_DEMONSTRATED: No evidence provided for this requirement.
- CHECK_FAILED: Requirement explicitly fails.

## OUTPUT FORMAT (JSON only):
{
  "overall_progress_bps": 8500,
  "quality_score": 85,
  "summary": "Design deliverable covers 3 of 4 required screens...",
  "criteria_verdicts": [
    {
      "criterion": "Dark mode theme mockup included",
      "verdict": "SUPPORTED",
      "evidence": "Figma frame #2 shows dark mode color tokens"
    }
  ]
}
```

### 3.4 How to Test Feature 3
```bash
curl -X POST http://localhost:8000/ai/deliverable/verify-multimodal \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: fairwork_internal_secret_key" \
  -d '{
    "deliverable_type": "DESIGN",
    "deliverable_content": "Figma file containing Dashboard, Login screen, and Settings page with responsive layouts.",
    "milestone_title": "UI Mockups",
    "acceptance_criteria": [
      "Dashboard screen with analytics charts",
      "Dark mode variant",
      "Mobile 375px responsive frame"
    ]
  }'
```

---

## ⚖️ Feature 4: AI Arbitrator Dossier & Evidence Cross-Examiner

### 4.1 The Feature
When a milestone enters dispute, SANKALP selects 3 peer arbitrators in [FairWork.sol](file:///c:/Users/perci/Desktop/college/AI/PJ-s/PERSON1%20YASH%20NAIK/contracts/contracts/FairWork.sol#L720). However, arbitrators face high cognitive load reading chat logs, technical diffs, and evidence files.
The **Arbitrator Dossier**:
- Generates a chronological timeline of events leading to the dispute.
- Creates an **Executive Claims vs. Fact Matrix**:
  - What the Client claimed (*"The backend API crashes on login"*)
  - What the Freelancer argued (*"It works on my commit 4a2b9"*)
  - What the Objective Evidence verifies (*"Jest test output shows test_auth.py passing, but environment variables were uncommitted"*)
- Provides an **Interactive Arbitrator Q&A tool** allowing arbitrators to ask natural questions (*"Did the client provide the Figma design before Day 5?"*).

### 4.2 Files to Create / Modify
| Action | File Path | Description |
|:---|:---|:---|
| **MODIFY** | `PERSON3 PERCY/prompts/dispute_summary.md` | Add claims matrix and timeline generation |
| **CREATE** | `PERSON3 PERCY/app/models/dossier.py` | Models for Claims Matrix & Arbitrator Q&A |
| **MODIFY** | `PERSON3 PERCY/app/routers/dispute.py` | Add `POST /ai/dispute/dossier` and `POST /ai/dispute/query` |
| **MODIFY** | `PERSON4 SUZAN/src/components/disputes/AiDisputeSummary.jsx` | Display split Claims vs Fact matrix |
| **MODIFY** | `PERSON4 SUZAN/src/pages/DisputesPage.jsx` | Embed interactive Arbitrator Q&A chatbox |

### 4.3 Step-by-Step Implementation

#### Step 1: Create `PERSON3 PERCY/app/models/dossier.py`
```python
from pydantic import BaseModel
from typing import List, Optional

class ClaimEvidenceRow(BaseModel):
    criterion: str
    client_claim: str
    freelancer_claim: str
    factual_evidence: str
    suggested_share_bps: int

class ArbitratorDossierResponse(BaseModel):
    dispute_id: str
    executive_summary: str
    recommended_share_bps: int
    claims_matrix: List[ClaimEvidenceRow]
    unresolved_questions: List[str]

class ArbitratorQueryRequest(BaseModel):
    dispute_id: str
    question: str
    context: dict

class ArbitratorQueryResponse(BaseModel):
    answer: str
    cited_evidence: List[str]
```

### 4.4 How to Test Feature 4
```bash
curl -X POST http://localhost:8000/ai/dispute/summary \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: fairwork_internal_secret_key" \
  -d '{
    "terms": {"title": "Fullstack Platform", "totalAmount": "2.0"},
    "milestone": {"title": "Backend API", "acceptanceCriteria": ["JWT Auth"]},
    "submission": {"notes": "All tests pass"},
    "rejection_reason": "Auth crashes on invalid password",
    "evidence": ["Jest test logs show 200 OK for valid credentials, 500 for invalid credentials"]
  }'
```
**Expected Output:** Neutral summary with criteria breakdown and split recommendation (e.g. 7000 bps = 70% to freelancer since core auth works but error handling was buggy).

---

## 🚀 Percy's Verification Checklist
- [ ] Pytest suite: `pytest PERSON3\ PERCY/tests` passes 100%
- [ ] All 4 endpoints return valid JSON under `MOCK=true` and live OpenAI mode
- [ ] No raw user input escapes `wrap_untrusted_content()`
- [ ] Response headers include `X-Internal-Key` authentication check
