from typing import Dict, Any, List
from datetime import datetime, timezone, timedelta
from app.models.draft import DraftContractRequest, DraftContractResponse
from app.models.review import ReviewContractRequest, ReviewContractResponse, ReviewFlag
from app.models.github import GithubAnalyzeRequest, GithubAnalyzeResponse, GithubSignals, CriterionResult
from app.models.dispute import DisputeSummaryRequest, DisputeSummaryResponse

def get_mock_draft_response(req: DraftContractRequest) -> DraftContractResponse:
    now = datetime.now(timezone.utc)
    client = req.parties.client.lower()
    freelancer = req.parties.freelancer.lower()
    
    deadline_1 = (now + timedelta(days=14)).strftime("%Y-%m-%dT%H:%M:%SZ")
    deadline_2 = (now + timedelta(days=28)).strftime("%Y-%m-%dT%H:%M:%SZ")

    terms = {
        "schemaVersion": "1.0",
        "title": "Decentralized Escrow Platform Development",
        "description": "Full-stack development of milestone-based freelance escrow with GitHub integration.",
        "client": client,
        "freelancer": freelancer,
        "currency": "ETH",
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
                "deadline": deadline_1,
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
                "deadline": deadline_2,
                "requiredProgressBps": 8500,
                "acceptanceCriteria": [
                    "FastAPI endpoints /ai/contract/draft and /ai/github/analyze implemented",
                    "Automated pytest suite passing with GitHub fixture tests"
                ]
            }
        ],
        "createdAt": now.strftime("%Y-%m-%dT%H:%M:%SZ")
    }

    open_questions = [
        "Please confirm GitHub repository URL before locking funds on-chain.",
        "Ensure both client and freelancer wallets are funded with gas for Polygon Amoy."
    ]
    warnings = [
        "latePenaltyBpsPerDay was assumed default (100 bps / 1% per day).",
        "reviewWindowDays was assumed default (5 days)."
    ]

    return DraftContractResponse(
        terms=terms,
        open_questions=open_questions,
        warnings=warnings
    )

def get_mock_review_response(req: ReviewContractRequest) -> ReviewContractResponse:
    terms = req.terms
    flags: List[ReviewFlag] = []
    score = 88

    # Check for potential flags in terms
    if terms.latePenaltyBpsPerDay > 300:
        flags.append(ReviewFlag(
            clause="latePenaltyBpsPerDay",
            issue="Daily late penalty exceeds standard rate (300+ bps / 3% per day).",
            suggestion="Reduce daily penalty to 100-200 bps to prevent disproportionate forfeitures.",
            suggested_rewrite="100",
            severity="CRITICAL" if terms.latePenaltyBpsPerDay > 500 else "WARNING"
        ))
        score -= 15 if terms.latePenaltyBpsPerDay > 500 else 10
    
    if terms.reviewWindowDays < 3:
        flags.append(ReviewFlag(
            clause="reviewWindowDays",
            issue="Client review window is unusually short (less than 3 days).",
            suggestion="Increase review window to 5 days to allow thorough verification.",
            suggested_rewrite="5",
            severity="WARNING"
        ))
        score -= 8

    if not flags:
        flags.append(ReviewFlag(
            clause="general",
            issue="No severe imbalances detected in contract terms.",
            suggestion="Ensure acceptance criteria tests are maintained in repository CI.",
            suggested_rewrite=None,
            severity="INFO"
        ))

    final_score = max(score, 50)
    summary = (
        f"Mock contract review generated {len(flags)} recommendation(s) with fairness score {final_score}/100."
    )

    return ReviewContractResponse(
        fairness_score=final_score,
        flags=flags,
        summary=summary
    )

def get_mock_github_analyze_response(req: GithubAnalyzeRequest) -> GithubAnalyzeResponse:
    criteria_results = []
    for criterion in req.milestone.acceptance_criteria:
        criteria_results.append(CriterionResult(
            criterion=criterion,
            met=True,
            evidence=f"Verified in commit {req.commit_sha or 'a1b2c3d'} via test suite and file tree inspection."
        ))

    signals = GithubSignals(
        commits=14,
        prs_merged=2,
        files_changed=18,
        lines_added=1420,
        tests_status="passing",
        release_tag="v0.1.0",
        contributors=["developer-alice", "contributor-bob"]
    )

    return GithubAnalyzeResponse(
        progress_bps=8750,
        confidence=0.92,
        signals=signals,
        criteria_results=criteria_results,
        summary="Milestone implementation verified successfully. All core criteria have passing tests and active PR merges.",
        risks=[
            "No high-severity gaming anomalies detected. Normal commit distribution observed."
        ]
    )

def get_mock_dispute_summary_response(req: DisputeSummaryRequest) -> DisputeSummaryResponse:
    summary = (
        "Neutral Dispute Assessment: The freelancer submitted the deliverables on time with passing unit tests. "
        "The client expressed concerns regarding edge case validation. "
        "Review of the GitHub report indicates that 80% of milestone scope was completed in good faith with verifiable commits."
    )
    return DisputeSummaryResponse(
        summary=summary,
        recommended_freelancer_share_bps=7500,
        reasoning=(
            "Advisory recommendation: 7500 bps (75%) payout to freelancer, 2500 bps (25%) refund to client. "
            "Evidence confirms substantial completion of primary endpoints and schemas. "
            "However, minor secondary criteria lacked end-to-end integration tests as noted in client evidence."
        )
    )

def get_mock_plan_from_brief(req: Any) -> Any:
    from app.models.plan import PlanFromBriefResponse
    from app.models.terms import AgreementTerms
    
    now = datetime.now(timezone.utc)
    client = (getattr(req, "client_address", None) or "0x1111111111111111111111111111111111111111").lower()
    freelancer = (getattr(req, "freelancer_address", None) or "0x2222222222222222222222222222222222222222").lower()
    total_budget = float(getattr(req, "total_budget", 1.0) or 1.0)
    currency = getattr(req, "currency", "ETH") or "ETH"
    brief = getattr(req, "brief", "Decentralized application project")
    repo = getattr(req, "repo_url", "https://github.com/fairwork-test/project-repo") or "https://github.com/fairwork-test/project-repo"

    m1_amount = round(total_budget * 0.4, 4)
    m2_amount = round(total_budget - m1_amount, 4)

    deadline_1 = (now + timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
    deadline_2 = (now + timedelta(days=14)).strftime("%Y-%m-%dT%H:%M:%SZ")

    terms_dict = {
        "schemaVersion": "1.0",
        "title": f"Plan: {brief[:50]}...",
        "description": f"Autonomous milestone plan generated from project brief: '{brief}'.",
        "client": client,
        "freelancer": freelancer,
        "currency": currency,
        "totalAmount": str(total_budget),
        "paymentMode": "MILESTONE",
        "latePenaltyBpsPerDay": 100,
        "maxLatePenaltyBps": 3000,
        "reviewWindowDays": 5,
        "graceDays": 3,
        "maxRevisions": 2,
        "github": {
            "repoUrl": repo,
            "branch": "main"
        },
        "milestones": [
            {
                "index": 0,
                "title": "Phase 1: Architecture, Core Schemas & Auth",
                "description": "Establish repository foundation, database migrations, authentication endpoints, and unit test suite.",
                "amount": str(m1_amount),
                "deadline": deadline_1,
                "requiredProgressBps": 8000,
                "acceptanceCriteria": [
                    "Database schema migrations run cleanly with zero errors",
                    "Core authentication API endpoints return 200 OK with test assertions",
                    "Initial project structure committed to repository main branch"
                ]
            },
            {
                "index": 1,
                "title": "Phase 2: Full System Integration & E2E Delivery",
                "description": "Complete remaining application workflows, automated end-to-end testing, and production deployment configuration.",
                "amount": str(m2_amount),
                "deadline": deadline_2,
                "requiredProgressBps": 8500,
                "acceptanceCriteria": [
                    "All functional user workflows pass end-to-end integration tests",
                    "Production bundle builds with zero errors or unresolved dependencies",
                    "Comprehensive deployment documentation and API spec provided"
                ]
            }
        ],
        "createdAt": now.strftime("%Y-%m-%dT%H:%M:%SZ")
    }

    validated_terms = AgreementTerms.model_validate(terms_dict)
    return PlanFromBriefResponse(
        terms=validated_terms,
        rationale="Decomposed into 2 sequential phases (Architecture & Foundation -> Full Delivery) to optimize milestone escrow release and verify core functionality first.",
        suggested_tech_stack=["React 18", "FastAPI / Node.js", "Polygon / Ethereum", "Tailwind CSS", "Prisma / SQLAlchemy"]
    )
