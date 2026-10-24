import json
import logging
from fastapi import APIRouter, Depends
from app.config import settings
from app.core.security import verify_internal_key, wrap_untrusted_content
from app.models.multimodal import MultimodalVerifyRequest, MultimodalVerifyResponse
from app.services.mock_data import get_mock_multimodal_verify_response
from app.services.llm_service import llm_service, load_prompt_template

logger = logging.getLogger("fairwork.multimodal")
router = APIRouter(tags=["Multimodal Deliverable Verification"])

@router.post(
    "/ai/deliverable/verify-multimodal",
    response_model=MultimodalVerifyResponse,
    dependencies=[Depends(verify_internal_key)]
)
async def verify_multimodal_deliverable(request: MultimodalVerifyRequest) -> MultimodalVerifyResponse:
    """
    Evaluates non-code deliverables (Figma mockups, live URLs, documentation, designs)
    against milestone acceptance criteria and returns 4-state verdicts and progress bps.
    """
    if settings.MOCK or not settings.LLM_API_KEY:
        logger.info("Serving /ai/deliverable/verify-multimodal via MOCK engine")
        return get_mock_multimodal_verify_response(request)

    wrapped_content = wrap_untrusted_content(
        request.deliverable_content,
        source="deliverable_content",
        max_chars=15000
    )

    criteria_formatted = "\n".join(f"- {c}" for c in request.acceptance_criteria)
    user_prompt = (
        f"Deliverable Type: {request.deliverable_type}\n"
        f"Milestone Title: {request.milestone_title}\n"
        f"Milestone Description: {request.milestone_description or 'N/A'}\n"
        f"Acceptance Criteria:\n{criteria_formatted}\n\n"
        f"Submitted Deliverable Content:\n{wrapped_content}\n\n"
        f"Please evaluate each criterion and return overall_progress_bps, quality_score, summary, and criteria_verdicts."
    )

    system_prompt = load_prompt_template("multimodal_review.md")

    try:
        raw_result = await llm_service.call_llm_json_with_retry(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_retries=2
        )
        return MultimodalVerifyResponse.model_validate(raw_result)
    except Exception as e:
        logger.warning(f"Live LLM multimodal verification failed, falling back to deterministic mock: {e}")
        return get_mock_multimodal_verify_response(request)
