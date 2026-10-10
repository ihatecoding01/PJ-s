from typing import List, Dict, Any, Tuple
from app.models.github import GithubSignals, CriterionResult

def calculate_deterministic_score(
    signals: GithubSignals,
    meaningful_lines_added: int,
    score_penalty_bps: int = 0
) -> int:
    """
    Computes deterministic repository score component (~40% weight -> max 4000 bps).
    Takes into account commits, meaningful diffs, merged PRs, CI status, and release tags.
    """
    score = 0

    # 1. Commit volume & cadence (up to 1000 bps)
    if signals.commits >= 10:
        score += 1000
    elif signals.commits >= 5:
        score += 800
    elif signals.commits >= 2:
        score += 500
    elif signals.commits == 1:
        score += 300

    # 2. Meaningful lines added (up to 1000 bps)
    if meaningful_lines_added >= 500:
        score += 1000
    elif meaningful_lines_added >= 200:
        score += 800
    elif meaningful_lines_added >= 50:
        score += 500
    elif meaningful_lines_added > 0:
        score += 250

    # 3. Merged pull requests (up to 800 bps)
    if signals.prs_merged >= 2:
        score += 800
    elif signals.prs_merged == 1:
        score += 600

    # 4. CI / Test status (up to 800 bps)
    if signals.tests_status == "passing":
        score += 800
    elif signals.tests_status == "none":
        score += 300  # Neutral, not failing but unverified by CI
    elif signals.tests_status == "failing":
        score -= 400  # Penalty for broken builds

    # 5. Release tag (up to 400 bps)
    if signals.release_tag:
        score += 400

    # Deduct anti-gaming penalty
    score -= score_penalty_bps

    # Clamp to [0, 4000]
    return max(0, min(4000, score))

def calculate_criteria_score(criteria_results: List[CriterionResult]) -> int:
    """
    Computes LLM criteria check component (~60% weight -> max 6000 bps).
    Based strictly on the fraction of criteria satisfied.
    """
    if not criteria_results:
        return 0

    met_count = sum(1 for c in criteria_results if c.met)
    total_count = len(criteria_results)

    fraction = met_count / total_count
    return round(fraction * 6000)

def compute_hybrid_progress(
    signals: GithubSignals,
    meaningful_lines_added: int,
    criteria_results: List[CriterionResult],
    confidence_penalty: float = 0.0,
    score_penalty_bps: int = 0,
    diff_truncated: bool = False,
) -> Tuple[int, float]:
    """
    Combines deterministic score (~40%) and criteria score (~60%) into progress_bps.
    Computes confidence score (0.0 to 1.0).
    Returns (progress_bps, confidence).
    """
    det_score = calculate_deterministic_score(signals, meaningful_lines_added, score_penalty_bps)
    crit_score = calculate_criteria_score(criteria_results)

    total_progress_bps = max(0, min(10000, det_score + crit_score))

    # Base confidence starts at 0.95
    conf = 0.95
    conf -= confidence_penalty

    if diff_truncated:
        conf -= 0.10
    if signals.commits <= 1:
        conf -= 0.10
    if signals.tests_status == "none":
        conf -= 0.05
    elif signals.tests_status == "failing":
        conf -= 0.15

    final_confidence = round(max(0.10, min(1.0, conf)), 2)
    return total_progress_bps, final_confidence
