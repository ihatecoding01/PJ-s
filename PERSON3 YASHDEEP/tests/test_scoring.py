import pytest
from app.models.github import GithubSignals, CriterionResult
from app.services.scoring import (
    calculate_deterministic_score,
    calculate_criteria_score,
    compute_hybrid_progress,
)

def test_deterministic_scoring_full():
    signals = GithubSignals(
        commits=12,
        prs_merged=2,
        files_changed=20,
        lines_added=600,
        tests_status="passing",
        release_tag="v1.0.0",
        contributors=["alice"]
    )
    score = calculate_deterministic_score(signals, meaningful_lines_added=600, score_penalty_bps=0)
    # 1000 (commits) + 1000 (lines) + 800 (prs) + 800 (passing CI) + 400 (tag) = 4000
    assert score == 4000

def test_deterministic_scoring_failing_ci():
    signals = GithubSignals(
        commits=5,
        prs_merged=0,
        files_changed=4,
        lines_added=150,
        tests_status="failing",
        release_tag=None,
        contributors=["bob"]
    )
    score = calculate_deterministic_score(signals, meaningful_lines_added=150, score_penalty_bps=0)
    # 800 (commits) + 500 (lines) + 0 (prs) - 400 (failing CI) = 900
    assert score == 900

def test_criteria_scoring_fractions():
    # 2 of 2 met -> 6000 bps
    res_full = [
        CriterionResult(criterion="Crit 1", met=True, evidence="Path A"),
        CriterionResult(criterion="Crit 2", met=True, evidence="Path B")
    ]
    assert calculate_criteria_score(res_full) == 6000

    # 1 of 2 met -> 3000 bps
    res_half = [
        CriterionResult(criterion="Crit 1", met=True, evidence="Path A"),
        CriterionResult(criterion="Crit 2", met=False, evidence="Missing")
    ]
    assert calculate_criteria_score(res_half) == 3000

    # 0 of 2 met -> 0 bps
    res_zero = [
        CriterionResult(criterion="Crit 1", met=False, evidence="No"),
        CriterionResult(criterion="Crit 2", met=False, evidence="No")
    ]
    assert calculate_criteria_score(res_zero) == 0

def test_compute_hybrid_progress_clamping():
    signals = GithubSignals(
        commits=15,
        prs_merged=3,
        files_changed=30,
        lines_added=2000,
        tests_status="passing",
        release_tag="v1.0.0",
        contributors=["alice", "bob"]
    )
    criteria = [
        CriterionResult(criterion="C1", met=True, evidence="yes"),
        CriterionResult(criterion="C2", met=True, evidence="yes"),
    ]
    progress, confidence = compute_hybrid_progress(
        signals=signals,
        meaningful_lines_added=2000,
        criteria_results=criteria,
        confidence_penalty=0.0
    )
    assert 9000 <= progress <= 10000
    assert 0.90 <= confidence <= 1.0

def test_confidence_penalty_applied():
    signals = GithubSignals(
        commits=1,
        prs_merged=0,
        files_changed=1,
        lines_added=10,
        tests_status="none",
        release_tag=None,
        contributors=["alice"]
    )
    criteria = [
        CriterionResult(criterion="C1", met=False, evidence="no")
    ]
    progress, confidence = compute_hybrid_progress(
        signals=signals,
        meaningful_lines_added=10,
        criteria_results=criteria,
        confidence_penalty=0.30,  # e.g. anti-gaming penalty
        diff_truncated=True
    )
    assert confidence < 0.60
    assert 0.0 <= confidence <= 1.0
