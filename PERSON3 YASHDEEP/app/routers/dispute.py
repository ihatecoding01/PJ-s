import json
import logging
from fastapi import APIRouter, Depends
from app.config import settings
from app.core.security import verify_internal_key, wrap_untrusted_content
from app.models.dispute import DisputeSummaryRequest, DisputeSummaryResponse
from app.services.mock_data import get_mock_dispute_summary_response
from app.services.llm_service import llm_service, load_prompt_template

logger = logging.getLogger("fairwork.dispute")
router = APIRouter(tags=["Dispute Arbitration"])

@router.post("/ai/dispute/summary", response_model=DisputeSummaryResponse, dependencies=[Depends(verify_internal_key)])
async def summarize_dispute(request: DisputeSummaryRequest) -> DisputeSummaryResponse:
    """
    Produces a neutral arbitration summary, arguments analysis, and an advisory
    freelancer payout share (in basis points) based on contract terms, milestone requirements,
    GitHub analysis report, and submitted party evidence.
    """
    if settings.MOCK or not settings.LLM_API_KEY:
        logger.info("Serving /ai/dispute/summary via MOCK engine")
        return get_mock_dispute_summary_response(request)

    # 1. Prepare sanitized untrusted context blocks
    submission_text = (
        json.dumps(request.submission.model_dump())
        if hasattr(request.submission, "model_dump")
        else json.dumps(request.submission) if isinstance(request.submission, dict)
        else str(request.submission)
    )

    terms_text = (
        json.dumps(request.terms.model_dump())
        if hasattr(request.terms, "model_dump")
        else json.dumps(request.terms)
    )

    milestone_text = (
        json.dumps(request.milestone.model_dump())
        if hasattr(request.milestone, "model_dump")
        else json.dumps(request.milestone)
    )

    gh_report_text = (
        json.dumps(request.github_report.model_dump())
        if hasattr(request.github_report, "model_dump")
        else json.dumps(request.github_report) if request.github_report
        else "No automated GitHub analysis report provided."
    )

    evidence_items = "\n".join(f"- {wrap_untrusted_content(ev, source='evidence_item', max_chars=2000)}" for ev in request.evidence)

    user_prompt = (
        f"AGREEMENT TERMS:\n{wrap_untrusted_content(terms_text, source='terms', max_chars=4000)}\n\n"
        f"DISPUTED MILESTONE:\n{wrap_untrusted_content(milestone_text, source='milestone', max_chars=3000)}\n\n"
        f"FREELANCER SUBMISSION:\n{wrap_untrusted_content(submission_text, source='submission', max_chars=2000)}\n\n"
        f"CLIENT REJECTION REASON:\n{wrap_untrusted_content(request.rejection_reason, source='rejection_reason', max_chars=2000)}\n\n"
        f"GITHUB AUTOMATED AUDIT REPORT:\n{wrap_untrusted_content(gh_report_text, source='github_report', max_chars=4000)}\n\n"
        f"SUBMITTED EVIDENCE STATEMENTS:\n{evidence_items}\n\n"
        f"Synthesize the arguments into an objective summary, identify what each side argued, what is proven, "
        f"and provide an advisory recommended_freelancer_share_bps (0-10000) with detailed criteria-backed reasoning."
    )

    system_prompt = load_prompt_template("dispute_summary.md")

    try:
        llm_output = await llm_service.call_llm_json_with_retry(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_retries=1
        )
        summary = str(llm_output.get("summary", ""))
        share_bps = int(llm_output.get("recommended_freelancer_share_bps", 5000))
        reasoning = str(llm_output.get("reasoning", ""))
    except Exception as e:
        logger.warning(f"LLM dispute summary failed, falling back to heuristic summary: {e}")
        summary = (
            f"Neutral Summary: Client rejected milestone submission citing: '{request.rejection_reason}'. "
            f"Freelancer submitted commit/notes. Both parties have provided contradictory statements requiring review."
        )
        share_bps = 5000
        reasoning = "Advisory recommendation: 50% split (5000 bps) pending manual arbitrator review of evidence."

    # Validate range
    share_bps = max(0, min(10000, share_bps))

    return DisputeSummaryResponse(
        summary=summary,
        recommended_freelancer_share_bps=share_bps,
        reasoning=reasoning
    )
