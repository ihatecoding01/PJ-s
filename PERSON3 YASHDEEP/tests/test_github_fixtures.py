import json
from pathlib import Path
from datetime import datetime, timezone
import pytest
from app.models.github import GithubSignals, CriterionResult
from app.services.anti_gaming import analyze_anti_gaming
from app.services.scoring import compute_hybrid_progress

FIXTURES_DIR = Path(__file__).parent / "fixtures"

def test_github_fixture_1_healthy_progress():
    """
    Evaluates recorded fixture 1: Legitimate active development with passing CI checks,
    clear test files, and incremental commits.
    """
    commits = json.loads((FIXTURES_DIR / "github_commits_fixture.json").read_text(encoding="utf-8"))
    compare = json.loads((FIXTURES_DIR / "github_compare_fixture.json").read_text(encoding="utf-8"))
    checks = json.loads((FIXTURES_DIR / "github_checks_fixture.json").read_text(encoding="utf-8"))

    files_changed = compare["files"]

    # Derive CI status
    all_passing = all(r["conclusion"] == "success" for r in checks["check_runs"])
    tests_status = "passing" if all_passing else "failing"

    since_dt = datetime.fromisoformat("2026-10-01T00:00:00+00:00")
    until_dt = datetime.fromisoformat("2026-10-10T00:00:00+00:00")

    risks, conf_penalty, score_penalty = analyze_anti_gaming(
        commits=commits,
        files_changed=files_changed,
        repo_info={"is_fork": False},
        tests_status=tests_status,
        window_since_dt=since_dt,
        window_until_dt=until_dt
    )

    # Clean development should trigger 0 high-severity anti-gaming risks
    assert len(risks) == 0
    assert conf_penalty == 0.0
    assert score_penalty == 0

    signals = GithubSignals(
        commits=len(commits),
        prs_merged=1,
        files_changed=len(files_changed),
        lines_added=sum(f["additions"] for f in files_changed),
        tests_status=tests_status,
        release_tag=None,
        contributors=["alicedev"]
    )

    criteria = [
        CriterionResult(criterion="JWT auth implemented", met=True, evidence="src/auth/jwt.py"),
        CriterionResult(criterion="Unit tests pass", met=True, evidence="tests/test_auth.py")
    ]

    progress_bps, confidence = compute_hybrid_progress(
        signals=signals,
        meaningful_lines_added=sum(f["additions"] for f in files_changed),
        criteria_results=criteria,
        confidence_penalty=conf_penalty
    )

    assert progress_bps >= 8000
    assert confidence >= 0.85

def test_github_fixture_2_gaming_detection():
    """
    Evaluates recorded fixture 2: Gaming attempt featuring forked repo, late commit dump,
    vendored lockfile dominating line additions, comment-only code, and no test suite.
    """
    fixture_data = json.loads((FIXTURES_DIR / "github_gaming_fixture.json").read_text(encoding="utf-8"))
    
    commits = fixture_data["commits"]
    files_changed = fixture_data["files"]
    repo_info = fixture_data["repo_info"]

    since_dt = datetime.fromisoformat("2026-10-01T00:00:00+00:00")
    until_dt = datetime.fromisoformat("2026-10-10T00:00:00+00:00")

    risks, conf_penalty, score_penalty = analyze_anti_gaming(
        commits=commits,
        files_changed=files_changed,
        repo_info=repo_info,
        tests_status="none",
        window_since_dt=since_dt,
        window_until_dt=until_dt
    )

    # Should detect multiple gaming anomalies
    assert any("fork" in r.lower() for r in risks)
    assert any("no automated test" in r.lower() for r in risks)
    assert any("vendored" in r.lower() for r in risks)
    assert conf_penalty > 0.20
    assert score_penalty > 1000

    signals = GithubSignals(
        commits=len(commits),
        prs_merged=0,
        files_changed=len(files_changed),
        lines_added=sum(f["additions"] for f in files_changed),
        tests_status="none",
        release_tag=None,
        contributors=["randomguy"]
    )

    criteria = [
        CriterionResult(criterion="Real backend feature", met=False, evidence="No substantive implementation")
    ]

    progress_bps, confidence = compute_hybrid_progress(
        signals=signals,
        meaningful_lines_added=0,
        criteria_results=criteria,
        confidence_penalty=conf_penalty,
        score_penalty_bps=score_penalty
    )

    # Score should be heavily depressed and confidence penalized
    assert progress_bps < 3000
    assert confidence < 0.65
