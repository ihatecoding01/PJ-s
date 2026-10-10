import re
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
import httpx
from app.config import settings
from app.core.cache import github_cache
from app.models.github import GithubSignals

logger = logging.getLogger("fairwork.github")

class GitHubAPIException(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(f"{code}: {message}")

def parse_github_url(repo_url: str) -> Tuple[str, str]:
    """Extracts (owner, repo) from GitHub URL."""
    # Matches https://github.com/owner/repo, git@github.com:owner/repo.git, etc.
    pattern = r"github\.com[/:]([a-zA-Z0-9_\-\.]+)/([a-zA-Z0-9_\-\.]+?)(?:\.git|/)?$"
    match = re.search(pattern, repo_url.strip())
    if not match:
        raise GitHubAPIException(
            code="INVALID_REPO_URL",
            message=f"Invalid GitHub repository URL: '{repo_url}'. Expected format: https://github.com/owner/repo",
            status_code=400,
        )
    return match.group(1), match.group(2)

class GitHubService:
    def __init__(self):
        self.base_url = "https://api.github.com"
        self.token = settings.GITHUB_TOKEN

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "FairWork-AIService/1.0",
        }
        if self.token:
            headers["Authorization"] = f"token {self.token}"
        return headers

    async def _request(self, client: httpx.AsyncClient, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Any:
        url = f"{self.base_url}{endpoint}"
        resp = await client.get(url, headers=self._get_headers(), params=params)

        # Check rate limits
        remaining = resp.headers.get("x-ratelimit-remaining")
        if (resp.status_code in (403, 429)) or (remaining is not None and remaining == "0"):
            logger.warning(f"GitHub rate limit hit: {resp.text}")
            raise GitHubAPIException(
                code="GITHUB_RATE_LIMIT",
                message="GitHub API rate limit exceeded. Please configure GITHUB_TOKEN or retry later.",
                status_code=429,
            )

        if resp.status_code == 404:
            if "/branches/" in endpoint or "/compare/" in endpoint:
                raise GitHubAPIException(
                    code="GITHUB_BRANCH_NOT_FOUND",
                    message="Target branch or comparison reference not found on repository.",
                    status_code=404,
                )
            raise GitHubAPIException(
                code="GITHUB_REPO_NOT_FOUND",
                message="GitHub repository not found or not accessible.",
                status_code=404,
            )

        if resp.status_code != 200:
            raise GitHubAPIException(
                code="GITHUB_API_ERROR",
                message=f"GitHub API returned error ({resp.status_code}): {resp.text[:200]}",
                status_code=resp.status_code,
            )

        return resp.json()

    async def fetch_repository_data(
        self,
        repo_url: str,
        branch: str,
        since: str,
        until: str,
        commit_sha: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Gathers commits, pull requests, files, and check statuses from GitHub.
        Caches aggregated responses in-memory for 5 minutes.
        """
        cache_key = f"gh:{repo_url}:{branch}:{since}:{until}:{commit_sha}"
        cached = github_cache.get(cache_key)
        if cached:
            logger.info(f"Serving cached GitHub analysis for {repo_url}")
            return cached

        owner, repo = parse_github_url(repo_url)

        async with httpx.AsyncClient(timeout=30.0) as client:
            # 1. Fetch repo metadata
            repo_meta = await self._request(client, f"/repos/{owner}/{repo}")

            # 2. Verify branch exists & get branch head
            try:
                branch_data = await self._request(client, f"/repos/{owner}/{repo}/branches/{branch}")
                head_sha = branch_data.get("commit", {}).get("sha", "")
            except GitHubAPIException as e:
                if e.code == "GITHUB_BRANCH_NOT_FOUND":
                    raise
                head_sha = ""

            # 3. Fetch commits in window [since, until] on branch
            commit_params = {
                "sha": branch,
                "since": since,
                "until": until,
                "per_page": 100,
            }
            try:
                commits = await self._request(client, f"/repos/{owner}/{repo}/commits", params=commit_params)
            except GitHubAPIException:
                commits = []

            # Check if specific commit_sha exists on branch
            commit_sha_found: Optional[bool] = None
            if commit_sha:
                # First check in window commits
                shas_in_window = [c.get("sha") for c in commits]
                if commit_sha in shas_in_window:
                    commit_sha_found = True
                else:
                    # Check if commit exists anywhere on repository branch
                    try:
                        commit_obj = await self._request(client, f"/repos/{owner}/{repo}/commits/{commit_sha}")
                        commit_sha_found = True if commit_obj else False
                    except GitHubAPIException:
                        commit_sha_found = False

            # 4. Fetch merged Pull Requests
            try:
                prs = await self._request(
                    client,
                    f"/repos/{owner}/{repo}/pulls",
                    params={"state": "closed", "base": branch, "per_page": 50}
                )
            except GitHubAPIException:
                prs = []

            # Filter PRs merged within [since, until]
            merged_prs = []
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
            until_dt = datetime.fromisoformat(until.replace("Z", "+00:00"))

            for pr in prs:
                merged_at = pr.get("merged_at")
                if merged_at:
                    pr_dt = datetime.fromisoformat(merged_at.replace("Z", "+00:00"))
                    if since_dt <= pr_dt <= until_dt:
                        merged_prs.append(pr)

            # 5. Fetch CI / Check Runs for head commit (or target commit_sha)
            target_eval_sha = commit_sha or head_sha
            tests_status = "none"
            if target_eval_sha:
                try:
                    check_runs_data = await self._request(
                        client, f"/repos/{owner}/{repo}/commits/{target_eval_sha}/check-runs"
                    )
                    runs = check_runs_data.get("check_runs", [])
                    if runs:
                        has_failure = any(r.get("conclusion") in ("failure", "timed_out", "action_required") for r in runs)
                        all_success = all(r.get("conclusion") == "success" for r in runs)
                        if has_failure:
                            tests_status = "failing"
                        elif all_success:
                            tests_status = "passing"
                except Exception:
                    pass

                # If check-runs were empty, check combined commit status
                if tests_status == "none":
                    try:
                        status_data = await self._request(
                            client, f"/repos/{owner}/{repo}/commits/{target_eval_sha}/status"
                        )
                        state = status_data.get("state")
                        if state == "success":
                            tests_status = "passing"
                        elif state in ("failure", "error"):
                            tests_status = "failing"
                    except Exception:
                        pass

            # 6. Fetch Releases / Tags
            release_tag: Optional[str] = None
            try:
                releases = await self._request(client, f"/repos/{owner}/{repo}/releases", params={"per_page": 20})
                for rel in releases:
                    pub_at = rel.get("published_at")
                    if pub_at:
                        rel_dt = datetime.fromisoformat(pub_at.replace("Z", "+00:00"))
                        if since_dt <= rel_dt <= until_dt:
                            release_tag = rel.get("tag_name")
                            break
            except Exception:
                pass

            # 7. Aggregate files changed and diff summaries
            # Sample commits or use compare API if multiple commits exist
            files_changed_list = []
            diff_truncated = False
            total_added = 0
            contributors_set = set()

            for c in commits:
                author_login = c.get("author", {}).get("login") if c.get("author") else None
                author_name = c.get("commit", {}).get("author", {}).get("name")
                if author_login:
                    contributors_set.add(author_login)
                elif author_name:
                    contributors_set.add(author_name)

            if len(commits) > 0:
                oldest_sha = commits[-1].get("sha")
                newest_sha = commits[0].get("sha")
                if oldest_sha and newest_sha and oldest_sha != newest_sha:
                    try:
                        compare_data = await self._request(
                            client, f"/repos/{owner}/{repo}/compare/{oldest_sha}^...{newest_sha}"
                        )
                        files_changed_list = compare_data.get("files", [])
                    except Exception:
                        # Fallback: inspect newest commit
                        try:
                            commit_detail = await self._request(client, f"/repos/{owner}/{repo}/commits/{newest_sha}")
                            files_changed_list = commit_detail.get("files", [])
                        except Exception:
                            files_changed_list = []
                else:
                    try:
                        commit_detail = await self._request(client, f"/repos/{owner}/{repo}/commits/{newest_sha}")
                        files_changed_list = commit_detail.get("files", [])
                    except Exception:
                        files_changed_list = []

            for f in files_changed_list:
                total_added += f.get("additions", 0)

            # Build compact digest
            repo_digest = self._build_repo_digest(
                owner=owner,
                repo=repo,
                branch=branch,
                commits=commits,
                merged_prs=merged_prs,
                files_changed=files_changed_list,
                tests_status=tests_status,
                max_chars=15000,
            )

            result = {
                "owner": owner,
                "repo": repo,
                "repo_info": repo_meta,
                "branch": branch,
                "head_sha": head_sha,
                "commits": commits,
                "commit_sha_found": commit_sha_found,
                "merged_prs": merged_prs,
                "files_changed": files_changed_list,
                "total_lines_added": total_added,
                "tests_status": tests_status,
                "release_tag": release_tag,
                "contributors": sorted(list(contributors_set)),
                "repo_digest": repo_digest,
                "diff_truncated": diff_truncated,
            }

            github_cache.set(cache_key, result, ttl_seconds=settings.GITHUB_CACHE_TTL_SECONDS)
            return result

    def _build_repo_digest(
        self,
        owner: str,
        repo: str,
        branch: str,
        commits: List[Dict[str, Any]],
        merged_prs: List[Dict[str, Any]],
        files_changed: List[Dict[str, Any]],
        tests_status: str,
        max_chars: int = 15000,
    ) -> str:
        """Constructs a compact text digest of git activities and file changes for the LLM."""
        lines = [
            f"Repository: {owner}/{repo} (branch: {branch})",
            f"CI Tests Status: {tests_status}",
            f"Total Commits in window: {len(commits)}",
            f"Merged PRs in window: {len(merged_prs)}",
            "",
            "### RECENT COMMIT LOGS:",
        ]
        for c in commits[:15]:
            sha = c.get("sha", "")[:7]
            msg = c.get("commit", {}).get("message", "").splitlines()[0]
            author = c.get("commit", {}).get("author", {}).get("name", "Unknown")
            lines.append(f"- [{sha}] {msg} (by {author})")

        lines.append("")
        lines.append("### FILES CHANGED & PATCH HIGHLIGHTS:")
        for f in files_changed[:25]:
            filename = f.get("filename", "")
            additions = f.get("additions", 0)
            deletions = f.get("deletions", 0)
            status = f.get("status", "modified")
            lines.append(f"* {filename} ({status}, +{additions} / -{deletions})")
            patch = f.get("patch", "")
            if patch and len(patch) > 0:
                # Add trimmed patch snippet
                patch_snippet = "\n".join(patch.splitlines()[:15])
                lines.append(f"  Snippet:\n{patch_snippet}\n")

        digest_str = "\n".join(lines)
        if len(digest_str) > max_chars:
            digest_str = digest_str[:max_chars] + "\n... [REPO DIGEST TRUNCATED DUE TO SIZE]"
        return digest_str

github_service = GitHubService()
