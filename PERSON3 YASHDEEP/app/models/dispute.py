from typing import List, Optional, Union, Dict, Any
from pydantic import BaseModel, Field
from app.models.terms import AgreementTerms, MilestoneTerms
from app.models.github import GithubAnalyzeResponse

class SubmissionInfo(BaseModel):
    commit_sha: Optional[str] = Field(default=None, description="Submitted commit SHA")
    pr_url: Optional[str] = Field(default=None, description="Submitted Pull Request URL")
    notes: Optional[str] = Field(default="", description="Freelancer's submission notes or demo instructions")

class DisputeSummaryRequest(BaseModel):
    terms: Union[AgreementTerms, Dict[str, Any]] = Field(..., description="Full agreement terms")
    milestone: Union[MilestoneTerms, Dict[str, Any]] = Field(..., description="Milestone under dispute")
    submission: Union[SubmissionInfo, Dict[str, Any], str] = Field(..., description="Milestone submission details")
    rejection_reason: str = Field(..., description="Client's stated rejection rationale")
    github_report: Optional[Union[GithubAnalyzeResponse, Dict[str, Any]]] = Field(default=None, description="Previous GitHub progress report if available")
    evidence: List[str] = Field(default_factory=list, description="Array of evidence statements or documents from both parties")

class DisputeSummaryResponse(BaseModel):
    summary: str = Field(..., description="Neutral summary of the dispute, arguments, and timeline")
    recommended_freelancer_share_bps: int = Field(..., ge=0, le=10000, description="Recommended advisory freelancer share in bps (0 to 10000)")
    reasoning: str = Field(..., description="Evidence-backed reasoning referencing specific criteria and arguments")
