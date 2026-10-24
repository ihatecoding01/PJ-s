import re
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple

VENDORED_OR_GENERATED_PATTERNS = [
    r"node_modules/",
    r"package-lock\.json",
    r"yarn\.lock",
    r"pnpm-lock\.yaml",
    r"dist/",
    r"build/",
    r"\.min\.(js|css)$",
    r"vendor/",
    r"\.next/",
    r"out/",
    r"coverage/",
]

def is_vendored_or_generated(filename: str) -> bool:
    for pat in VENDORED_OR_GENERATED_PATTERNS:
        if re.search(pat, filename, re.IGNORECASE):
            return True
    return False

def is_test_file(filename: str) -> bool:
    low = filename.lower()
    return any(p in low for p in [
        "test/", "tests/", "__tests__/", ".test.", ".spec.", "_test.", "_spec.", "test_"
    ])

def analyze_anti_gaming(
    commits: List[Dict[str, Any]],
    files_changed: List[Dict[str, Any]],
    repo_info: Dict[str, Any],
    tests_status: str,
    commit_sha_submitted: Optional[str] = None,
    commit_sha_found: Optional[bool] = None,
    window_since_dt: Optional[datetime] = None,
    window_until_dt: Optional[datetime] = None,
) -> Tuple[List[str], float, int]:
    """
    Evaluates repository data against anti-gaming heuristics.
    Returns:
      (risks, confidence_penalty, deterministic_score_penalty_bps)
    """
    risks: List[str] = []
    confidence_penalty = 0.0
    score_penalty_bps = 0

    if not commits:
        risks.append("No commits found in the milestone window on the target branch.")
        return risks, 0.50, 4000

    # 1. Force push or missing commit SHA
    if commit_sha_submitted:
        if commit_sha_found is False:
            risks.append(f"Submitted commit SHA '{commit_sha_submitted[:8]}' was not found on the active branch history (possible history rewrite or force push).")
            confidence_penalty += 0.25
            score_penalty_bps += 1500

    # 2. Fork or copied repo
    if repo_info.get("is_fork"):
        risks.append("Repository is a fork; verify that work is original and not inherited from parent repository.")
        confidence_penalty += 0.15
        score_penalty_bps += 500

    # 3. No tests detected
    has_test_files = any(is_test_file(f.get("filename", "")) for f in files_changed)
    if not has_test_files and tests_status == "none":
        risks.append("No automated test files or CI test suites detected for this milestone.")
        confidence_penalty += 0.15
        score_penalty_bps += 800

    # 4. Mass-generated or vendored files dominating lines
    total_added = sum(f.get("additions", 0) for f in files_changed)
    vendored_added = sum(
        f.get("additions", 0) for f in files_changed if is_vendored_or_generated(f.get("filename", ""))
    )
    if total_added > 500 and (vendored_added / total_added) > 0.70:
        risks.append(f"Over {int((vendored_added/total_added)*100)}% of lines added are vendored libraries or auto-generated lockfiles.")
        confidence_penalty += 0.15
        score_penalty_bps += 1000

    # 5. Whitespace or comment-only diffs
    meaningful_files = [f for f in files_changed if not is_vendored_or_generated(f.get("filename", ""))]
    if meaningful_files:
        whitespace_or_comment_only = True
        for f in meaningful_files:
            patch = f.get("patch", "")
            if not patch:
                continue
            # Extract added lines (lines starting with + but not ++)
            added_lines = [
                line[1:].strip() for line in patch.splitlines()
                if line.startswith("+") and not line.startswith("+++")
            ]
            for line in added_lines:
                if not line:
                    continue
                # If line is not a single line comment
                if not (line.startswith("//") or line.startswith("#") or line.startswith("/*") or line.startswith("*") or line.startswith("<!--")):
                    whitespace_or_comment_only = False
                    break
            if not whitespace_or_comment_only:
                break
        
        if whitespace_or_comment_only and len(meaningful_files) > 0 and total_added > 50:
            risks.append("Diff analysis indicates changes are primarily whitespace or comments with little substantive code.")
            confidence_penalty += 0.30
            score_penalty_bps += 2000

    # 6. Commit dump right before deadline
    if len(commits) > 3 and window_since_dt and window_until_dt:
        window_duration = (window_until_dt - window_since_dt).total_seconds()
        if window_duration > 86400:  # More than 1 day window
            # Check timestamps of commits
            commit_dts = []
            for c in commits:
                dt_str = c.get("commit", {}).get("author", {}).get("date") or c.get("date")
                if dt_str:
                    try:
                        clean_str = dt_str.replace("Z", "+00:00")
                        c_dt = datetime.fromisoformat(clean_str)
                        if c_dt.tzinfo is None:
                            c_dt = c_dt.replace(tzinfo=timezone.utc)
                        commit_dts.append(c_dt)
                    except Exception:
                        pass
            if commit_dts:
                # Check how many commits occurred in the final 5% of the window
                threshold = window_until_dt.timestamp() - (window_duration * 0.05)
                late_commits = [dt for dt in commit_dts if dt.timestamp() >= threshold]
                if len(late_commits) / len(commit_dts) > 0.80:
                    risks.append("Commit dump pattern detected: >80% of commits were pushed at the very end of the milestone window.")
                    confidence_penalty += 0.10
                    score_penalty_bps += 400

    # 7. Commits dated outside the window
    commits_outside_window = 0
    if window_since_dt and window_until_dt:
        for c in commits:
            dt_str = c.get("commit", {}).get("author", {}).get("date") or c.get("date")
            if dt_str:
                try:
                    clean_str = dt_str.replace("Z", "+00:00")
                    c_dt = datetime.fromisoformat(clean_str)
                    if c_dt.tzinfo is None:
                        c_dt = c_dt.replace(tzinfo=timezone.utc)
                    if c_dt < window_since_dt or c_dt > window_until_dt:
                        commits_outside_window += 1
                except Exception:
                    pass
    if commits_outside_window > 0:
        risks.append(f"{commits_outside_window} commit(s) carry timestamps dated outside the formal milestone window.")
        confidence_penalty += 0.05

    return risks, confidence_penalty, score_penalty_bps
