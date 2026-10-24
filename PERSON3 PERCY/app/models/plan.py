from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.terms import AgreementTerms

class PlanFromBriefRequest(BaseModel):
    brief: str = Field(..., min_length=5, description="Client high-level goal or project brief")
    total_budget: Optional[float] = Field(default=1.0, gt=0, description="Total budget in currency units")
    currency: Optional[str] = Field(default="ETH", description="Currency ticker (e.g. ETH, MATIC)")
    client_address: Optional[str] = Field(
        default="0x1111111111111111111111111111111111111111",
        description="Client Ethereum wallet address"
    )
    freelancer_address: Optional[str] = Field(
        default="0x2222222222222222222222222222222222222222",
        description="Freelancer Ethereum wallet address"
    )
    repo_url: Optional[str] = Field(
        default="https://github.com/fairwork-test/project-repo",
        description="Target GitHub repository URL"
    )

class PlanFromBriefResponse(BaseModel):
    terms: AgreementTerms = Field(..., description="Canonical AgreementTerms ready for review and escrow lock")
    rationale: Optional[str] = Field(default="", description="AI architectural rationale for milestone breakdown")
    suggested_tech_stack: Optional[List[str]] = Field(default_factory=list, description="Recommended technology stack")
