from typing import Dict, Any, List
from datetime import datetime, timezone, timedelta
from app.models.draft import DraftContractRequest, DraftContractResponse
from app.models.review import ReviewContractRequest, ReviewContractResponse, ReviewFlag
from app.models.github import GithubAnalyzeRequest, GithubAnalyzeResponse, GithubSignals, CriterionResult
from app.models.dispute import DisputeSummaryRequest, DisputeSummaryResponse
from app.models.multimodal import MultimodalVerifyRequest, MultimodalVerifyResponse, CriterionVerdict, VerdictEnum
from app.models.dossier import (
    ArbitratorDossierRequest,
    ArbitratorDossierResponse,
    ArbitratorQueryRequest,
    ArbitratorQueryResponse,
    ClaimEvidenceRow,
)

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

def get_mock_multimodal_verify_response(req: MultimodalVerifyRequest) -> MultimodalVerifyResponse:
    content_lower = req.deliverable_content.lower()
    verdicts: List[CriterionVerdict] = []
    
    supported_weight = 0.0
    total_criteria = len(req.acceptance_criteria)

    for crit in req.acceptance_criteria:
        words = [w.lower() for w in crit.split() if len(w) > 3]
        matches = [w for w in words if w in content_lower]
        
        if len(matches) >= 2 or (len(words) <= 2 and len(matches) >= 1):
            verdict = VerdictEnum.SUPPORTED
            evidence = f"Verified matching references '{', '.join(matches)}' in submitted {req.deliverable_type} asset."
            supported_weight += 1.0
        elif len(matches) == 1:
            verdict = VerdictEnum.UNCLEAR
            evidence = f"Partial reference '{matches[0]}' observed, but comprehensive specification requires manual verification."
            supported_weight += 0.5
        else:
            verdict = VerdictEnum.NOT_DEMONSTRATED
            evidence = f"No direct components or references for '{crit}' identified in submitted {req.deliverable_type}."

        verdicts.append(CriterionVerdict(
            criterion=crit,
            verdict=verdict,
            evidence=evidence
        ))

    overall_progress_bps = int((supported_weight / max(1, total_criteria)) * 10000)
    quality_score = max(40, min(100, int((supported_weight / max(1, total_criteria)) * 100)))
    passing = overall_progress_bps >= (req.required_progress_bps or 7000)

    summary = (
        f"Multimodal {req.deliverable_type} verification completed. "
        f"{sum(1 for v in verdicts if v.verdict == VerdictEnum.SUPPORTED)} of {total_criteria} criteria supported. "
        f"Overall estimated deliverable progress: {overall_progress_bps / 100:.1f}%."
    )

    return MultimodalVerifyResponse(
        overall_progress_bps=overall_progress_bps,
        quality_score=quality_score,
        summary=summary,
        criteria_verdicts=verdicts,
        tests_passing=passing
    )

def get_mock_arbitrator_dossier_response(req: ArbitratorDossierRequest) -> ArbitratorDossierResponse:
    # Extract criteria from milestone terms
    milestone_obj = req.milestone if isinstance(req.milestone, dict) else req.milestone.model_dump()
    criteria = milestone_obj.get("acceptance_criteria") or milestone_obj.get("acceptanceCriteria") or [
        "Core deliverable functionality",
        "Automated unit & integration tests",
        "Clean documentation and interface specs"
    ]

    claims_matrix = []
    for idx, crit in enumerate(criteria):
        if idx == 0:
            client_claim = f"Client argues primary requirements were partially unmet: {req.rejection_reason[:80]}"
            freelancer_claim = "Freelancer claims primary workflow functions as agreed in signed agreement."
            factual_evidence = "Evidence and test run logs demonstrate 80% happy path operations succeed."
            share = 7500
        elif idx == 1:
            client_claim = "Client points to unhandled exceptions and missing edge case coverage."
            freelancer_claim = "Freelancer ran unit tests and confirmed all documented assertions pass."
            factual_evidence = "Test logs confirm passing test suite, but stress tests for network drops were omitted."
            share = 6500
        else:
            client_claim = "Client requested revisions that were not completed before deadline."
            freelancer_claim = "Freelancer completed agreed scope; additional requests exceeded initial specification."
            factual_evidence = "Terms diff indicates revision requests were beyond original milestone bounds."
            share = 7000

        claims_matrix.append(ClaimEvidenceRow(
            criterion=crit,
            client_claim=client_claim,
            freelancer_claim=freelancer_claim,
            factual_evidence=factual_evidence,
            suggested_share_bps=share
        ))

    recommended_share_bps = int(sum(r.suggested_share_bps for r in claims_matrix) / max(1, len(claims_matrix)))

    timeline = [
        {"event": "Agreement Locked On-Chain", "actor": "Both Parties", "details": "Terms sealed with canonical SHA-256 hash."},
        {"event": "Milestone Submitted", "actor": "Freelancer", "details": "Deliverable code and commit hashes submitted for review."},
        {"event": "Milestone Rejected", "actor": "Client", "details": f"Reason: {req.rejection_reason}"},
        {"event": "Dispute Initiated", "actor": "System", "details": "Escrow paused; 3 peer community arbitrators assigned."}
    ]

    unresolved_questions = [
        "Did the client provide clear reproduction steps for the claimed failure before rejecting?",
        "Did the freelancer communicate technical constraints prior to the milestone deadline?",
        "Do the submitted automated tests satisfy the standard of good-faith engineering under Section 4?"
    ]

    executive_summary = (
        f"Neutral Arbitrator Dossier for Dispute #{req.dispute_id}: "
        f"Disagreement centers on deliverable completeness for milestone '{milestone_obj.get('title', 'Milestone')}'. "
        f"Client rejection rationale: \"{req.rejection_reason}\". "
        f"Objective evidence confirms {len(claims_matrix)} core criteria investigated, with substantial work verified. "
        f"Advisory recommendation: {recommended_share_bps} bps ({recommended_share_bps / 100:.1f}%) to Freelancer, "
        f"with the remaining balance refunded to Client."
    )

    return ArbitratorDossierResponse(
        dispute_id=req.dispute_id,
        executive_summary=executive_summary,
        recommended_share_bps=recommended_share_bps,
        claims_matrix=claims_matrix,
        timeline=timeline,
        unresolved_questions=unresolved_questions
    )

def get_mock_arbitrator_query_response(req: ArbitratorQueryRequest) -> ArbitratorQueryResponse:
    q_lower = req.question.lower()
    
    if "deadline" in q_lower or "date" in q_lower or "late" in q_lower:
        answer = (
            "Based on verified on-chain timestamp records, the freelancer submitted the deliverable within the "
            "allowable milestone window prior to grace period expiration. No late penalty clauses were triggered."
        )
        cited_evidence = [
            "Milestone submission event timestamp in On-Chain Ledger",
            "Agreement Terms Section 2.4: Late Penalty Schedule"
        ]
    elif "test" in q_lower or "pass" in q_lower or "jest" in q_lower or "crash" in q_lower:
        answer = (
            "The submitted repository contains an automated test suite where all 24 unit tests pass cleanly. "
            "However, the error handling middleware fails gracefully only on expected input errors, but triggers an "
            "unhandled promise rejection when simulated database timeouts occur."
        )
        cited_evidence = [
            "Jest Automated Test Execution Log (commit a1b2c3)",
            "Server error logs provided in Client Evidence Attachment #1"
        ]
    elif "figma" in q_lower or "design" in q_lower or "ui" in q_lower:
        answer = (
            "The client provided Figma design components on Day 2 of the agreement. The freelancer's submitted screens "
            "faithfully implement the design tokens and layout grids, but mobile responsive break-points (375px) were missing."
        )
        cited_evidence = [
            "Thread Message #4 from Client containing Figma URL",
            "Figma frame inspection audit report"
        ]
    elif "revision" in q_lower or "feedback" in q_lower:
        answer = (
            "The signed agreement permits up to 2 formal revision rounds. Timeline records show the client issued 1 "
            "formal revision notice before initiating the dispute."
        )
        cited_evidence = [
            "Agreement Terms: maxRevisions = 2",
            "Dispute Timeline: 1 review rejection logged"
        ]
    else:
        answer = (
            f"Regarding '{req.question}': An objective review of the signed agreement terms, submitted deliverables, "
            f"and timeline events confirms that work was substantially delivered in good faith. Any minor deficiencies "
            f"are advisory factors for the 3-arbitrator panel when setting the final payout percentage."
        )
        cited_evidence = [
            "Signed Agreement Terms & Canonical Hash",
            "Dispute Evidence Dossier Index"
        ]

    return ArbitratorQueryResponse(
        dispute_id=req.dispute_id,
        question=req.question,
        answer=answer,
        cited_evidence=cited_evidence
    )

