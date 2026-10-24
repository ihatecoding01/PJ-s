from datetime import datetime, timezone
from typing import List, Literal, Optional
from pydantic import BaseModel, Field

class GitHubRepoInfo(BaseModel):
    repoUrl: str = Field(..., description="Full URL to the GitHub repository, e.g. https://github.com/owner/repo")
    branch: str = Field(default="main", description="Target git branch, e.g. main")

class MilestoneTerms(BaseModel):
    index: int = Field(..., ge=0, description="0-indexed sequence number of the milestone")
    title: str = Field(..., description="Title of the milestone")
    description: str = Field(default="", description="Detailed description of milestone scope")
    amount: str = Field(..., description="Payment amount in ether units, e.g. '0.5'")
    deadline: str = Field(..., description="ISO-8601 formatted deadline timestamp, e.g. 2026-11-01T00:00:00Z")
    requiredProgressBps: int = Field(default=8000, ge=0, le=10000, description="Minimum progress basis points required for payout (e.g. 8000 = 80%)")
    acceptanceCriteria: List[str] = Field(..., min_length=1, description="Concrete checkable criteria against git repo")

class AgreementTerms(BaseModel):
    schemaVersion: str = Field(default="1.0", description="Schema specification version")
    title: str = Field(..., description="Agreement title")
    description: str = Field(default="", description="Agreement overview")
    client: str = Field(..., description="Client wallet address (0x...)")
    freelancer: str = Field(..., description="Freelancer wallet address (0x...)")
    currency: str = Field(default="ETH", description="Currency ticker (e.g. ETH)")
    totalAmount: str = Field(..., description="Total payment in ether units, e.g. '1.5'")
    paymentMode: Literal["MILESTONE", "LUMP_SUM"] = Field(..., description="Payment mode: MILESTONE or LUMP_SUM")
    latePenaltyBpsPerDay: int = Field(default=100, ge=0, le=10000, description="Daily late penalty in bps (100 = 1%)")
    maxLatePenaltyBps: int = Field(default=3000, ge=0, le=10000, description="Maximum penalty cap in bps (3000 = 30%)")
    reviewWindowDays: int = Field(default=5, ge=1, description="Client review window in days before auto-claim")
    graceDays: int = Field(default=3, ge=0, description="Grace period days after deadline before client reclaim")
    maxRevisions: int = Field(default=2, ge=0, description="Maximum number of review revisions")
    github: GitHubRepoInfo = Field(..., description="GitHub repository configuration")
    milestones: List[MilestoneTerms] = Field(..., min_length=1, description="Milestone breakdowns")
    createdAt: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        description="ISO-8601 creation timestamp"
    )
