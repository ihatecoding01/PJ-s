import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from app.config import settings
from app.core.security import verify_internal_key, wrap_untrusted_content
from app.models.github import (
    GithubAnalyzeRequest,
    GithubAnalyzeResponse,
    GithubSignals,
    CriterionResult,
)
from app.services.mock_data import get_mock_github_analyze_response
from app.services.github_service import github_service, GitHubAPIException
from app.services.anti_gaming import analyze_anti_gaming
from app.services.scoring import compute_hybrid_progress
from app.services.llm_service import llm_service, load_prompt_template

logger = logging.getLogger("fairwork.analyze")
router = APIRouter(tags=["GitHub Code Analysis"])

@router.post("/ai/github/analyze", response_model=GithubAnalyzeResponse, dependencies=[Depends(verify_internal_key)])
async def analyze_github(request: GithubAnalyzeRequest) -> GithubAnalyzeResponse:
    """
    Evaluates repository development progress against milestone acceptance criteria
    using a hybrid evaluation model (40% deterministic signals + 60% LLM criteria check),
    augmented with anti-gaming risk detection.
    """
    # 1. Day 1 MOCK support
    if settings.MOCK or not settings.LLM_API_KEY:
        logger.info("Serving /ai/github/analyze via MOCK engine")
        return get_mock_github_analyze_response(request)

    # 2. Fetch repository data from GitHub REST API
    try:
        repo_data = await github_service.fetch_repository_data(
            repo_url=request.repo_url,
            branch=request.branch,
            since=request.since,
            until=request.until,
            commit_sha=request.commit_sha
        )
    except GitHubAPIException as e:
        logger.warning(f"GitHub API error encountered: {e.code} - {e.message}")
        raise HTTPException(
            status_code=e.status_code,
            detail={"code": e.code, "message": e.message}
        )
    except Exception as e:
        logger.error(f"Unexpected error while fetching GitHub data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "GITHUB_FETCH_FAILED", "message": str(e)}
        )

    # 3. Signals extraction
    commits = repo_data.get("commits", [])
    merged_prs = repo_data.get("merged_prs", [])
    files_changed = repo_data.get("files_changed", [])
    tests_status = repo_data.get("tests_status", "none")
    release_tag = repo_data.get("release_tag")
    contributors = repo_data.get("contributors", [])
    total_lines_added = repo_data.get("total_lines_added", 0)

    signals = GithubSignals(
        commits=len(commits),
        prs_merged=len(merged_prs),
        files_changed=len(files_changed),
        lines_added=total_lines_added,
        tests_status=tests_status,
        release_tag=release_tag,
        contributors=contributors
    )

    # 4. Anti-Gaming heuristics
    since_dt = datetime.fromisoformat(request.since.replace("Z", "+00:00"))
    until_dt = datetime.fromisoformat(request.until.replace("Z", "+00:00"))

    gaming_risks, conf_penalty, score_penalty_bps = analyze_anti_gaming(
        commits=commits,
        files_changed=files_changed,
        repo_info=repo_data.get("repo_info", {}),
        tests_status=tests_status,
        commit_sha_submitted=request.commit_sha,
        commit_sha_found=repo_data.get("commit_sha_found"),
        window_since_dt=since_dt,
        window_until_dt=until_dt,
    )

    # 5. LLM Criteria Check
    # Build prompt with repo digest and acceptance criteria
    repo_digest = repo_data.get("repo_digest", "")
    wrapped_digest = wrap_untrusted_content(repo_digest, source="github_repo_digest", max_chars=16000)

    criteria_list = request.milestone.acceptance_criteria
    criteria_text = "\n".join(f"{idx+1}. {c}" for idx, c in enumerate(criteria_list))

    user_prompt = (
        f"MILESTONE DETAILS:\n"
        f"Title: {request.milestone.title}\n"
        f"Description: {request.milestone.description}\n"
        f"Required Progress BPS: {request.milestone.required_progress_bps}\n\n"
        f"ACCEPTANCE CRITERIA TO EVALUATE:\n"
        f"{criteria_text}\n\n"
        f"REPOSITORY EVIDENCE DIGEST:\n"
        f"{wrapped_digest}\n\n"
        f"Evaluate each criterion against the repository evidence, cite specific files/commits, "
        f"and return criteria_results, summary, and detected_risks."
    )

    system_prompt = load_prompt_template("github_criteria.md")

    criteria_results: list[CriterionResult] = []
    summary = ""
    llm_risks = []

    try:
        llm_output = await llm_service.call_llm_json_with_retry(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_retries=1
        )
        raw_results = llm_output.get("criteria_results", [])
        for item in raw_results:
            if isinstance(item, dict) and "criterion" in item and "met" in item:
                criteria_results.append(CriterionResult(
                    criterion=str(item.get("criterion")),
                    met=bool(item.get("met")),
                    evidence=str(item.get("evidence", "Verified in repo commit history."))
                ))
        summary = str(llm_output.get("summary", "Milestone analyzed against repository activity."))
        llm_risks = [str(r) for r in llm_output.get("detected_risks", []) if r]
    except Exception as e:
        logger.warning(f"LLM criteria evaluation failed; using fallback deterministic inspection: {e}")
        # Fallback: inspect criteria deterministically
        for c in criteria_list:
            criteria_results.append(CriterionResult(
                criterion=c,
                met=(len(commits) > 0 and tests_status != "failing"),
                evidence="Evaluated via fallback repository signals."
            ))
        summary = f"Evaluated based on {len(commits)} commits and CI status '{tests_status}'."

    # If LLM didn't return all criteria, fill in missing
    evaluated_criteria_names = {cr.criterion.lower() for cr in criteria_results}
    for c in criteria_list:
        if c.lower() not in evaluated_criteria_names:
            criteria_results.append(CriterionResult(
                criterion=c,
                met=False,
                evidence="Insufficient evidence found in repository files."
            ))

    # 6. Hybrid Score Computation
    # Calculate meaningful lines added (excluding vendored)
    from app.services.anti_gaming import is_vendored_or_generated
    meaningful_lines = sum(
        f.get("additions", 0) for f in files_changed if not is_vendored_or_generated(f.get("filename", ""))
    )

    all_risks = list(gaming_risks)
    for r in llm_risks:
        if r not in all_risks:
            all_risks.append(r)

    if not all_risks:
        all_risks.append("No critical development or integrity risks detected.")

    progress_bps, confidence = compute_hybrid_progress(
        signals=signals,
        meaningful_lines_added=meaningful_lines,
        criteria_results=criteria_results,
        confidence_penalty=conf_penalty,
        score_penalty_bps=score_penalty_bps,
        diff_truncated=repo_data.get("diff_truncated", False),
    )

    return GithubAnalyzeResponse(
        progress_bps=progress_bps,
        confidence=confidence,
        signals=signals,
        criteria_results=criteria_results,
        summary=summary,
        risks=all_risks
    )
