import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from app.config import settings
from app.core.security import verify_internal_key, wrap_untrusted_content
from app.models.draft import DraftContractRequest, DraftContractResponse
from app.models.plan import PlanFromBriefRequest, PlanFromBriefResponse
from app.models.terms import AgreementTerms
from app.services.mock_data import get_mock_draft_response, get_mock_plan_from_brief
from app.services.llm_service import llm_service, load_prompt_template
from app.services.validator import validate_agreement_terms, attempt_best_effort_repair

logger = logging.getLogger("fairwork.draft")
router = APIRouter(tags=["Agreement Drafting"])

@router.post("/ai/contract/draft", response_model=DraftContractResponse, dependencies=[Depends(verify_internal_key)])
async def draft_contract(request: DraftContractRequest) -> DraftContractResponse:
    """
    Extracts structured AgreementTerms from chat history and post context,
    validates the terms deterministically, and identifies open questions/warnings.
    """
    # 1. Day 1 MOCK support for seamless P2 integration
    if settings.MOCK or not settings.LLM_API_KEY:
        logger.info("Serving /ai/contract/draft via MOCK engine")
        return get_mock_draft_response(request)

    # 2. Build sanitized untrusted content block
    chat_lines = []
    for msg in request.thread_messages:
        chat_lines.append(f"[{msg.ts}] {msg.sender}: {msg.text}")
    chat_block = "\n".join(chat_lines)

    wrapped_chat = wrap_untrusted_content(chat_block, source="chat_thread", max_chars=12000)

    post_block = ""
    if request.post_context:
        post_str = json.dumps(request.post_context) if isinstance(request.post_context, dict) else str(request.post_context)
        post_block = wrap_untrusted_content(post_str, source="post_context", max_chars=4000)

    user_instructions = (
        f"PARTIES INVOLVED:\n"
        f"- Client Address: {request.parties.client.lower()}\n"
        f"- Freelancer Address: {request.parties.freelancer.lower()}\n\n"
        f"COMMUNITY POST CONTEXT:\n{post_block}\n\n"
        f"CHAT THREAD CONTEXT:\n{wrapped_chat}\n\n"
        f"Extract all project agreement parameters, calculate milestone amounts and deadlines, "
        f"and return the strictly valid JSON object."
    )

    system_prompt = load_prompt_template("contract_draft.md")

    now = datetime.now(timezone.utc)

    # 3. LLM call with retry loop on validation errors
    last_errors = []
    assumed_warnings = []
    final_terms_data = None
    open_questions = []

    for attempt in range(3):  # initial attempt + up to 2 retries
        try:
            prompt_to_send = user_instructions
            if attempt > 0 and last_errors:
                prompt_to_send += (
                    f"\n\nVALIDATION FAILED ON ATTEMPT {attempt}. PLEASE FIX THESE DETERMINISTIC ERRORS:\n"
                    + "\n".join(f"- {e}" for e in last_errors)
                )

            raw_parsed = await llm_service.call_llm_json_with_retry(
                system_prompt=system_prompt,
                user_prompt=prompt_to_send,
                max_retries=1
            )

            candidate_terms = raw_parsed.get("terms", raw_parsed)
            open_questions = raw_parsed.get("open_questions", [])
            llm_warnings = raw_parsed.get("warnings", [])

            # Force client & freelancer addresses
            candidate_terms["client"] = request.parties.client.lower()
            candidate_terms["freelancer"] = request.parties.freelancer.lower()

            sanitized_terms, validation_errors, assumptions = validate_agreement_terms(candidate_terms, reference_time=now)
            assumed_warnings.extend(assumptions)
            assumed_warnings.extend(llm_warnings)

            if not validation_errors:
                final_terms_data = sanitized_terms
                break
            else:
                last_errors = validation_errors
                logger.warning(f"Draft validation attempt {attempt+1} errors: {validation_errors}")

        except Exception as e:
            logger.warning(f"Error during draft extraction attempt {attempt+1}: {e}")
            last_errors = [str(e)]

    # 4. Fallback: If LLM failed validation after retries, apply best effort repair
    if not final_terms_data:
        logger.warning("LLM draft output failed validation; applying best-effort deterministic repair.")
        fallback_source = candidate_terms if "candidate_terms" in locals() and candidate_terms else {
            "title": "Freelance Agreement",
            "client": request.parties.client.lower(),
            "freelancer": request.parties.freelancer.lower(),
            "paymentMode": "MILESTONE",
            "totalAmount": "1.0",
        }
        repaired_terms, repair_warnings = attempt_best_effort_repair(fallback_source, reference_time=now)
        final_terms_data = repaired_terms
        assumed_warnings.extend(repair_warnings)
        assumed_warnings.extend(last_errors)

    # Deduplicate warnings
    unique_warnings = list(dict.fromkeys(assumed_warnings))
    unique_questions = list(dict.fromkeys(open_questions))

    # Validate output schema against Pydantic model
    validated_terms = AgreementTerms.model_validate(final_terms_data)

    return DraftContractResponse(
        terms=validated_terms,
        open_questions=unique_questions,
        warnings=unique_warnings
    )


@router.post("/ai/contract/plan-from-brief", response_model=PlanFromBriefResponse, dependencies=[Depends(verify_internal_key)])
async def generate_plan_from_brief(request: PlanFromBriefRequest) -> PlanFromBriefResponse:
    """
    Autonomously decomposes a client brief/goal into a structured, milestone-based
    AgreementTerms plan with concrete acceptance criteria and budget allocations.
    """
    if settings.MOCK or not settings.LLM_API_KEY:
        logger.info("Serving /ai/contract/plan-from-brief via MOCK engine")
        return get_mock_plan_from_brief(request)

    now = datetime.now(timezone.utc)
    wrapped_brief = wrap_untrusted_content(request.brief, source="client_brief", max_chars=8000)

    user_instructions = (
        f"CLIENT HIGH-LEVEL BRIEF:\n{wrapped_brief}\n\n"
        f"PLANNING PARAMETERS:\n"
        f"- Total Budget: {request.total_budget} {request.currency}\n"
        f"- Client Address: {request.client_address.lower()}\n"
        f"- Freelancer Address: {request.freelancer_address.lower()}\n"
        f"- Target Repo: {request.repo_url}\n\n"
        f"Decompose this project goal into 2 to 4 milestones with strictly sequential deadlines, "
        f"exact budget allocation, and objectively verifiable acceptance criteria. "
        f"Return strictly valid JSON matching the schema."
    )

    system_prompt = load_prompt_template("plan_generator.md")

    last_errors = []
    final_terms_data = None
    rationale = "Autonomously decomposed from client brief."
    suggested_tech_stack = ["TypeScript", "React", "Node.js"]

    for attempt in range(3):
        try:
            prompt_to_send = user_instructions
            if attempt > 0 and last_errors:
                prompt_to_send += (
                    f"\n\nVALIDATION FAILED ON ATTEMPT {attempt}. FIX THESE ERRORS:\n"
                    + "\n".join(f"- {e}" for e in last_errors)
                )

            raw_parsed = await llm_service.call_llm_json_with_retry(
                system_prompt=system_prompt,
                user_prompt=prompt_to_send,
                max_retries=1
            )

            candidate_terms = raw_parsed.get("terms", raw_parsed)
            rationale = raw_parsed.get("rationale", rationale)
            suggested_tech_stack = raw_parsed.get("suggested_tech_stack", suggested_tech_stack)

            candidate_terms["client"] = request.client_address.lower()
            candidate_terms["freelancer"] = request.freelancer_address.lower()
            candidate_terms["totalAmount"] = str(request.total_budget)
            candidate_terms["currency"] = request.currency.upper()
            if "github" not in candidate_terms:
                candidate_terms["github"] = {"repoUrl": request.repo_url, "branch": "main"}

            sanitized_terms, validation_errors, _ = validate_agreement_terms(candidate_terms, reference_time=now)

            if not validation_errors:
                final_terms_data = sanitized_terms
                break
            else:
                last_errors = validation_errors
                logger.warning(f"Plan validation attempt {attempt+1} errors: {validation_errors}")

        except Exception as e:
            logger.warning(f"Error during plan generation attempt {attempt+1}: {e}")
            last_errors = [str(e)]

    if not final_terms_data:
        logger.warning("LLM plan generation failed validation; applying best-effort deterministic repair.")
        fallback_source = candidate_terms if "candidate_terms" in locals() and candidate_terms else {
            "title": f"Plan: {request.brief[:40]}",
            "client": request.client_address.lower(),
            "freelancer": request.freelancer_address.lower(),
            "paymentMode": "MILESTONE",
            "totalAmount": str(request.total_budget),
            "currency": request.currency,
        }
        repaired_terms, _ = attempt_best_effort_repair(fallback_source, reference_time=now)
        final_terms_data = repaired_terms

    validated_terms = AgreementTerms.model_validate(final_terms_data)

    return PlanFromBriefResponse(
        terms=validated_terms,
        rationale=rationale,
        suggested_tech_stack=suggested_tech_stack
    )
