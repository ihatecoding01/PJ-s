from typing import List, Optional, Literal, Union
from pydantic import BaseModel, Field

class MilestoneAnalyzeInput(BaseModel):
    title: str = Field(..., description="Title of the milestone being evaluated")
    description: str = Field(default="", description="Description of the milestone scope")
    acceptance_criteria: List[str] = Field(..., min_length=1, description="List of acceptance criteria to check")
    required_progress_bps: int = Field(default=8000, ge=0, le=10000, description="Target progress in bps (default 8000)")

class GithubAnalyzeRequest(BaseModel):
    repo_url: str = Field(..., description="GitHub repository URL, e.g. https://github.com/owner/repo")
    branch: str = Field(default="main", description="Branch to inspect")
    since: str = Field(..., description="ISO-8601 start timestamp of milestone period")
    until: str = Field(..., description="ISO-8601 end timestamp of milestone period")
    commit_sha: Optional[str] = Field(default=None, description="Optional specific commit SHA submitted by freelancer")
    milestone: MilestoneAnalyzeInput = Field(..., description="Milestone details and acceptance criteria")

class GithubSignals(BaseModel):
    commits: int = Field(default=0, ge=0, description="Total commits in the window")
    prs_merged: int = Field(default=0, ge=0, description="Merged PRs into branch in the window")
    files_changed: int = Field(default=0, ge=0, description="Number of files touched in commits/compare")
    lines_added: int = Field(default=0, ge=0, description="Lines of code added in the window")
    tests_status: Literal["passing", "failing", "none"] = Field(..., description="CI / test status for latest or target commit")
    release_tag: Optional[Union[str, bool]] = Field(default=None, description="Release tag in the window if created")
    contributors: List[str] = Field(default_factory=list, description="Unique contributors in the commits")

class CriterionResult(BaseModel):
    criterion: str = Field(..., description="The acceptance criterion evaluated")
    met: bool = Field(..., description="Whether criterion is satisfied")
    evidence: str = Field(..., description="Specific file path, commit, PR, or reasoning demonstrating compliance or failure")

class GithubAnalyzeResponse(BaseModel):
    progress_bps: int = Field(..., ge=0, le=10000, description="Progress score in basis points (0-10000)")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Evaluation confidence score between 0.0 and 1.0")
    signals: GithubSignals = Field(..., description="Deterministic repository signals collected")
    criteria_results: List[CriterionResult] = Field(..., description="Criteria satisfaction breakdown")
    summary: str = Field(..., description="Executive summary of development progress and findings")
    risks: List[str] = Field(default_factory=list, description="Anti-gaming findings, anomalies, and project risks")
