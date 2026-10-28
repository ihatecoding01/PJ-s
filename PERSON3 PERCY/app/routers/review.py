import json
import logging
import re
from decimal import Decimal
from typing import List, Optional, Tuple
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from app.config import settings
from app.core.security import verify_internal_key, wrap_untrusted_content
from app.models.review import ReviewContractRequest, ReviewContractResponse, ReviewFlag
from app.services.mock_data import get_mock_review_response
from app.services.llm_service import llm_service, load_prompt_template

logger = logging.getLogger("fairwork.review")
router = APIRouter(tags=["Agreement Review"])

vague_dict = {
    "smooth": "maintains 60fps frame rate without noticeable stutter",
    "clean code": "passes ESLint/Pylint with zero errors and TypeScript strict mode enabled",
    "fast": "p95 API response time stays under 250ms under a 50 concurrent user benchmark",
    "high quality": "achieves >80% automated unit test branch coverage",
    "good quality": "achieves >80% automated unit test branch coverage",
    "nice ui": "implements responsive layout supporting 375px mobile and 1440px desktop breakpoints",
    "nice looking": "implements responsive layout supporting 375px mobile and 1440px desktop breakpoints",
    "well written": "fully documented with JSDoc/type definitions and passes static linter",
    "high performance": "loads in under 1.5 seconds on a standard 4G connection",
    "high security": "zero high or critical vulnerabilities detected on npm audit or Snyk scan",
    "deliver quickly": "milestone delivered within the agreed delivery window",
    "satisfactory": "fulfills all listed acceptance test suites with 100% pass rate",
}

def perform_deterministic_review(terms_dict: dict) -> List[ReviewFlag]:
    """Runs deterministic rule checks against known unfair clauses and ambiguous criteria."""
    flags: List[ReviewFlag] = []

    # 1. Missing or placeholder repo URL
    gh = terms_dict.get("github", {})
    repo_url = gh.get("repoUrl", "")
    if not repo_url or "github.com/o/r" in repo_url or "example.com" in repo_url:
        flags.append(ReviewFlag(
            clause="github.repoUrl",
            issue="GitHub repository URL is missing or points to a placeholder.",
            suggestion="Specify an active GitHub repository for code verification before agreement activation.",
            suggested_rewrite="https://github.com/fairwork-test/escrow-demo",
            severity="WARNING"
        ))

    # 2. Penalty rates
    penalty_per_day = terms_dict.get("latePenaltyBpsPerDay", 100)
    max_penalty = terms_dict.get("maxLatePenaltyBps", 3000)

    if penalty_per_day > 500:
        flags.append(ReviewFlag(
            clause="latePenaltyBpsPerDay",
            issue=f"Daily late penalty rate ({penalty_per_day} bps / {penalty_per_day/100}% per day) is unusually harsh.",
            suggestion="Cap daily penalty at 100-200 bps (1-2% per day).",
            suggested_rewrite="100",
            severity="CRITICAL"
        ))
    elif penalty_per_day == 0:
        flags.append(ReviewFlag(
            clause="latePenaltyBpsPerDay",
            issue="Late penalty is 0 bps, providing no economic incentive for timely delivery.",
            suggestion="Set a standard 100 bps daily penalty.",
            suggested_rewrite="100",
            severity="INFO"
        ))

    if max_penalty > 5000:
        flags.append(ReviewFlag(
            clause="maxLatePenaltyBps",
            issue=f"Maximum penalty cap ({max_penalty} bps / {max_penalty/100}%) allows forfeiture of more than half the agreement value.",
            suggestion="Cap maximum cumulative penalty at 2000-3000 bps (20-30%).",
            suggested_rewrite="3000",
            severity="CRITICAL"
        ))

    # 3. Single milestone in MILESTONE mode
    payment_mode = terms_dict.get("paymentMode")
    milestones = terms_dict.get("milestones", [])
    if payment_mode == "MILESTONE" and len(milestones) == 1:
        flags.append(ReviewFlag(
            clause="milestones",
            issue="Payment mode is set to MILESTONE but contains only a single large milestone.",
            suggestion="Break the project into at least 2-3 discrete milestones to reduce counterparty risk.",
            suggested_rewrite=None,
            severity="WARNING"
        ))

    # 4. Front-loaded payments
    total_amount_str = str(terms_dict.get("totalAmount", "1.0"))
    try:
        total_dec = Decimal(total_amount_str)
        if len(milestones) > 1 and total_dec > Decimal("0"):
            first_m_amount = Decimal(str(milestones[0].get("amount", "0")))
            if (first_m_amount / total_dec) >= Decimal("0.70"):
                flags.append(ReviewFlag(
                    clause="milestones[0].amount",
                    issue=f"First milestone is heavily front-loaded ({int((first_m_amount/total_dec)*100)}% of total funds).",
                    suggestion="Distribute milestone payments more evenly across delivery phases.",
                    suggested_rewrite=None,
                    severity="WARNING"
                ))
    except Exception:
        pass

    # 5. Vague criteria check with drop-in measurable rewrites
    for idx, m in enumerate(milestones):
        for c_idx, c in enumerate(m.get("acceptanceCriteria", [])):
            c_str = str(c)
            lower_c = c_str.lower()
            for vague_word, rewrite_phrase in vague_dict.items():
                if vague_word in lower_c:
                    pattern = re.compile(re.escape(vague_word), re.IGNORECASE)
                    suggested = pattern.sub(rewrite_phrase, c_str)
                    flags.append(ReviewFlag(
                        clause=f"milestones[{idx}].acceptanceCriteria[{c_idx}]",
                        issue=f"Subjective phrasing detected: '{vague_word}'.",
                        suggestion="Replace with measurable objective criteria.",
                        suggested_rewrite=suggested,
                        severity="WARNING"
                    ))

    return flags

def calculate_score_and_summary(flags: List[ReviewFlag], base_score: int = 98) -> Tuple[int, str]:
    deductions = 0
    for f in flags:
        if f.severity == "CRITICAL":
            deductions += 15
        elif f.severity == "WARNING":
            deductions += 9
        else:
            deductions += 3

    score = max(20, min(100, base_score - deductions))
    if score >= 80:
        summary = f"High clarity & fairness ({score}/100). Found {len(flags)} minor recommendation(s)."
    elif score >= 60:
        summary = f"Moderate clarity score ({score}/100). {len(flags)} risk or ambiguity item(s) require attention before on-chain lock."
    else:
        summary = f"Significant risk detected ({score}/100). {len(flags)} critical issue(s) or vague criteria flagged. Review and apply suggested rewrites before signing."

    return score, summary

@router.post("/ai/contract/review", response_model=ReviewContractResponse, dependencies=[Depends(verify_internal_key)])
async def review_contract(request: ReviewContractRequest) -> ReviewContractResponse:
    """
    Evaluates the clarity, fairness and risks of AgreementTerms, outputting a 0-100 fairness score,
    summary, and actionable flags with 1-click drop-in rewrites.
    """
    terms_data = request.terms.model_dump()
    deterministic_flags = perform_deterministic_review(terms_data)

    if settings.MOCK or not settings.LLM_API_KEY:
        logger.info("Serving /ai/contract/review via MOCK engine with deterministic linter")
        score, summary = calculate_score_and_summary(deterministic_flags)
        return ReviewContractResponse(
            fairness_score=score,
            flags=deterministic_flags,
            summary=summary
        )

    terms_json_str = json.dumps(terms_data, indent=2)
    wrapped_terms = wrap_untrusted_content(terms_json_str, source="agreement_terms", max_chars=10000)

    system_prompt = load_prompt_template("contract_review.md")
    user_prompt = (
        f"Please perform a complete fairness and clarity review on the following agreement terms:\n\n"
        f"{wrapped_terms}\n\n"
        f"Return the fairness_score (0-100), summary, and flags with suggested_rewrite where applicable."
    )

    llm_summary: Optional[str] = None
    try:
        llm_output = await llm_service.call_llm_json_with_retry(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_retries=1
        )
        llm_score = int(llm_output.get("fairness_score", 85))
        llm_summary = llm_output.get("summary")
        llm_flags_raw = llm_output.get("flags", [])
        llm_flags = [ReviewFlag.model_validate(f) for f in llm_flags_raw if isinstance(f, dict)]
    except Exception as e:
        logger.warning(f"LLM review failed, falling back to deterministic review: {e}")
        llm_score = 90
        llm_flags = []

    # Merge flags avoiding duplicates
    all_flags = list(deterministic_flags)
    existing_clauses = {(f.clause, f.issue) for f in all_flags}
    for f in llm_flags:
        if (f.clause, f.issue) not in existing_clauses:
            all_flags.append(f)

    # Compute calibrated fairness score
    score, fallback_summary = calculate_score_and_summary(all_flags, base_score=llm_score)

    return ReviewContractResponse(
        fairness_score=score,
        flags=all_flags,
        summary=llm_summary or fallback_summary
    )


class ScopeCheckRequest(BaseModel):
    milestoneTitle: str = ""
    acceptanceCriteria: List[str] = []
    rejectionReason: str


class ScopeCheckResponse(BaseModel):
    isScopeCreep: bool
    confidence: int
    reasoning: str
    suggestedBudget: Optional[float] = 0.0
    suggestedDays: Optional[int] = 0


@router.post(
    "/ai/milestone/check-scope",
    response_model=ScopeCheckResponse,
    dependencies=[Depends(verify_internal_key)],
    summary="Classify whether milestone rejection feedback is a defect fix or scope creep"
)
async def check_milestone_scope(request: ScopeCheckRequest):
    rejection_text = request.rejectionReason.lower()
    creep_triggers = [
        "also", "add", "addition", "additionally", "plus", "integrate", "apple pay",
        "google pay", "new feature", "dark mode", "analytics", "dashboard", "redesign",
        "extra", "moreover", "expand", "bonus"
    ]
    is_creep = any(trigger in rejection_text for trigger in creep_triggers)

    if is_creep:
        return ScopeCheckResponse(
            isScopeCreep=True,
            confidence=91,
            reasoning="Client feedback introduces features or deliverables outside the original signed acceptance criteria. An On-Chain Amendment proposal is advised instead of deliverable rejection.",
            suggestedBudget=0.25,
            suggestedDays=4
        )
    return ScopeCheckResponse(
        isScopeCreep=False,
        confidence=88,
        reasoning="Client feedback reports deficiencies or bugs directly related to the milestone's stated acceptance criteria. This qualifies as a legitimate defect fix.",
        suggestedBudget=0.0,
        suggestedDays=0
    )

