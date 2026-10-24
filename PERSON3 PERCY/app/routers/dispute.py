import json
import logging
from fastapi import APIRouter, Depends
from app.config import settings
from app.core.security import verify_internal_key, wrap_untrusted_content
from app.models.dispute import DisputeSummaryRequest, DisputeSummaryResponse
from app.models.dossier import (
    ArbitratorDossierRequest,
    ArbitratorDossierResponse,
    ArbitratorQueryRequest,
    ArbitratorQueryResponse,
)
from app.services.mock_data import (
    get_mock_dispute_summary_response,
    get_mock_arbitrator_dossier_response,
    get_mock_arbitrator_query_response,
)
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

@router.post("/ai/dispute/dossier", response_model=ArbitratorDossierResponse, dependencies=[Depends(verify_internal_key)])
async def generate_arbitrator_dossier(request: ArbitratorDossierRequest) -> ArbitratorDossierResponse:
    """
    Generates an executive dossier for the 3 peer community arbitrators:
    1. Executive timeline of agreement lifecycle events
    2. Split Claims vs. Fact Matrix (Client claim vs Freelancer defense vs Objective evidence)
    3. Pro-rated advisory payout recommendation (in basis points)
    4. Unresolved questions for the arbitration panel to probe
    """
    if settings.MOCK or not settings.LLM_API_KEY:
        logger.info("Serving /ai/dispute/dossier via MOCK engine")
        return get_mock_arbitrator_dossier_response(request)

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
    evidence_items = "\n".join(f"- {wrap_untrusted_content(ev, source='evidence', max_chars=2000)}" for ev in request.evidence)

    user_prompt = (
        f"GENERATE ARBITRATOR DOSSIER FOR DISPUTE: {request.dispute_id}\n\n"
        f"AGREEMENT TERMS:\n{wrap_untrusted_content(terms_text, source='terms', max_chars=4000)}\n\n"
        f"DISPUTED MILESTONE:\n{wrap_untrusted_content(milestone_text, source='milestone', max_chars=3000)}\n\n"
        f"FREELANCER SUBMISSION:\n{wrap_untrusted_content(submission_text, source='submission', max_chars=2000)}\n\n"
        f"CLIENT REJECTION REASON:\n{wrap_untrusted_content(request.rejection_reason, source='rejection_reason', max_chars=2000)}\n\n"
        f"SUBMITTED EVIDENCE:\n{evidence_items}\n\n"
        f"Produce the executive Claims vs Fact matrix, timeline, and recommended_share_bps."
    )

    system_prompt = load_prompt_template("dispute_summary.md")

    try:
        llm_output = await llm_service.call_llm_json_with_retry(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_retries=1
        )
        return ArbitratorDossierResponse(
            dispute_id=request.dispute_id,
            executive_summary=str(llm_output.get("executive_summary", "")),
            recommended_share_bps=int(llm_output.get("recommended_share_bps", 5000)),
            claims_matrix=llm_output.get("claims_matrix", []),
            timeline=llm_output.get("timeline", []),
            unresolved_questions=llm_output.get("unresolved_questions", [])
        )
    except Exception as e:
        logger.warning(f"LLM arbitrator dossier failed, falling back to mock: {e}")
        return get_mock_arbitrator_dossier_response(request)

@router.post("/ai/dispute/query", response_model=ArbitratorQueryResponse, dependencies=[Depends(verify_internal_key)])
async def query_arbitrator_evidence(request: ArbitratorQueryRequest) -> ArbitratorQueryResponse:
    """
    Arbitrator Cross-Examiner Q&A tool.
    Allows human arbitrators to query facts, dates, deliverables, or criteria,
    returning direct factual answers with cited evidence points.
    """
    if settings.MOCK or not settings.LLM_API_KEY:
        logger.info("Serving /ai/dispute/query via MOCK engine")
        return get_mock_arbitrator_query_response(request)

    context_json = json.dumps(request.context)
    user_prompt = (
        f"ARBITRATOR QUESTION FOR DISPUTE {request.dispute_id}:\n"
        f"{wrap_untrusted_content(request.question, source='arbitrator_question', max_chars=1000)}\n\n"
        f"DISPUTE CONTEXT & EVIDENCE:\n"
        f"{wrap_untrusted_content(context_json, source='dispute_context', max_chars=6000)}\n\n"
        f"Answer the question directly and factually, citing specific evidence sources."
    )

    system_prompt = load_prompt_template("dispute_summary.md")

    try:
        llm_output = await llm_service.call_llm_json_with_retry(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_retries=1
        )
        return ArbitratorQueryResponse(
            dispute_id=request.dispute_id,
            question=request.question,
            answer=str(llm_output.get("answer", "")),
            cited_evidence=llm_output.get("cited_evidence", [])
        )
    except Exception as e:
        logger.warning(f"LLM arbitrator query failed, falling back to mock: {e}")
        return get_mock_arbitrator_query_response(request)

