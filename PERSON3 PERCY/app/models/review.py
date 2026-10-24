from typing import List, Union, Dict, Any
from pydantic import BaseModel, Field
from app.models.terms import AgreementTerms

class ReviewFlag(BaseModel):
    clause: str = Field(..., description="Target clause or JSON path, e.g. milestones[0].deadline")
    issue: str = Field(..., description="Identified concern or risk in the clause")
    suggestion: str = Field(..., description="Actionable suggestion to make the clause fairer")

class ReviewContractRequest(BaseModel):
    terms: AgreementTerms = Field(..., description="Agreement terms to review")

class ReviewContractResponse(BaseModel):
    fairness_score: int = Field(..., ge=0, le=100, description="Overall fairness score from 0 (very unfair) to 100 (exemplary)")
    flags: List[ReviewFlag] = Field(default_factory=list, description="List of flagged issues and improvements")
