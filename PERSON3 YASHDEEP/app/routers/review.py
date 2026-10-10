import json
import logging
from decimal import Decimal
from typing import List
from fastapi import APIRouter, Depends
from app.config import settings
from app.core.security import verify_internal_key, wrap_untrusted_content
from app.models.review import ReviewContractRequest, ReviewContractResponse, ReviewFlag
from app.services.mock_data import get_mock_review_response
from app.services.llm_service import llm_service, load_prompt_template

logger = logging.getLogger("fairwork.review")
router = APIRouter(tags=["Agreement Review"])

def perform_deterministic_review(terms_dict: dict) -> List[ReviewFlag]:
    """Runs deterministic rule checks against known unfair clauses."""
    flags: List[ReviewFlag] = []

    # 1. Missing or placeholder repo URL
    gh = terms_dict.get("github", {})
    repo_url = gh.get("repoUrl", "")
    if not repo_url or "github.com/o/r" in repo_url or "example.com" in repo_url:
        flags.append(ReviewFlag(
            clause="github.repoUrl",
            issue="GitHub repository URL is missing or points to a placeholder.",
            suggestion="Specify an active GitHub repository for code verification before agreement activation."
        ))

    # 2. Penalty rates
    penalty_per_day = terms_dict.get("latePenaltyBpsPerDay", 100)
    max_penalty = terms_dict.get("maxLatePenaltyBps", 3000)

    if penalty_per_day > 500:
        flags.append(ReviewFlag(
            clause="latePenaltyBpsPerDay",
            issue=f"Daily late penalty rate ({penalty_per_day} bps / {penalty_per_day/100}% per day) is unusually harsh.",
            suggestion="Cap daily penalty at 100-200 bps (1-2% per day)."
        ))
    elif penalty_per_day == 0:
        flags.append(ReviewFlag(
            clause="latePenaltyBpsPerDay",
            issue="Late penalty is 0 bps, providing no economic incentive for timely delivery.",
            suggestion="Set a standard 100 bps daily penalty."
        ))

    if max_penalty > 5000:
        flags.append(ReviewFlag(
            clause="maxLatePenaltyBps",
            issue=f"Maximum penalty cap ({max_penalty} bps / {max_penalty/100}%) allows forfeiture of more than half the agreement value.",
            suggestion="Cap maximum cumulative penalty at 2000-3000 bps (20-30%)."
        ))

    # 3. Single milestone in MILESTONE mode
    payment_mode = terms_dict.get("paymentMode")
    milestones = terms_dict.get("milestones", [])
    if payment_mode == "MILESTONE" and len(milestones) == 1:
        flags.append(ReviewFlag(
            clause="milestones",
            issue="Payment mode is set to MILESTONE but contains only a single large milestone.",
            suggestion="Break the project into at least 2-3 discrete milestones to reduce counterparty risk."
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
                    suggestion="Distribute milestone payments more evenly across delivery phases."
                ))
    except Exception:
        pass

    # 5. Vague criteria check
    vague_phrases = ["good quality", "clean code", "well written", "nice looking", "high performance", "satisfactory"]
    for idx, m in enumerate(milestones):
        for c in m.get("acceptanceCriteria", []):
            for v in vague_phrases:
                if v in str(c).lower():
                    flags.append(ReviewFlag(
                        clause=f"milestones[{idx}].acceptanceCriteria",
                        issue=f"Criterion '{c}' contains subjective phrasing ('{v}').",
                        suggestion="Replace with measurable criteria, such as passing test suites or concrete endpoint contracts."
                    ))
                    break

    return flags

@router.post("/ai/contract/review", response_model=ReviewContractResponse, dependencies=[Depends(verify_internal_key)])
async def review_contract(request: ReviewContractRequest) -> ReviewContractResponse:
    """
    Evaluates the fairness and risks of AgreementTerms, outputting a 0-100 fairness score
    and actionable flags.
    """
    if settings.MOCK or not settings.LLM_API_KEY:
        logger.info("Serving /ai/contract/review via MOCK engine")
        return get_mock_review_response(request)

    terms_data = request.terms.model_dump()
    deterministic_flags = perform_deterministic_review(terms_data)

    terms_json_str = json.dumps(terms_data, indent=2)
    wrapped_terms = wrap_untrusted_content(terms_json_str, source="agreement_terms", max_chars=10000)

    system_prompt = load_prompt_template("contract_review.md")
    user_prompt = (
        f"Please perform a complete fairness review on the following agreement terms:\n\n"
        f"{wrapped_terms}\n\n"
        f"Return the fairness_score (0-100) and flags."
    )

    try:
        llm_output = await llm_service.call_llm_json_with_retry(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_retries=1
        )
        llm_score = int(llm_output.get("fairness_score", 80))
        llm_flags_raw = llm_output.get("flags", [])
        llm_flags = [ReviewFlag.model_validate(f) for f in llm_flags_raw if isinstance(f, dict)]
    except Exception as e:
        logger.warning(f"LLM review failed, falling back to deterministic review: {e}")
        llm_score = 85
        llm_flags = []

    # Merge flags avoiding duplicates
    all_flags = list(deterministic_flags)
    existing_clauses = {(f.clause, f.issue) for f in all_flags}
    for f in llm_flags:
        if (f.clause, f.issue) not in existing_clauses:
            all_flags.append(f)

    # Compute calibrated fairness score
    penalty_deduction = len(all_flags) * 6
    final_score = max(20, min(100, llm_score - penalty_deduction if len(deterministic_flags) > 0 else llm_score))

    return ReviewContractResponse(
        fairness_score=final_score,
        flags=all_flags
    )
