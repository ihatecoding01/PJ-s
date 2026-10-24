from typing import List, Optional, Union, Dict, Any
from pydantic import BaseModel, Field
from app.models.terms import AgreementTerms, MilestoneTerms
from app.models.dispute import SubmissionInfo

class ClaimEvidenceRow(BaseModel):
    criterion: str = Field(..., description="The disputed milestone criterion or contract term")
    client_claim: str = Field(..., description="The client's contention or dissatisfaction")
    freelancer_claim: str = Field(..., description="The freelancer's defense or proof of work")
    factual_evidence: str = Field(..., description="Objective findings from commit diffs, tests, or deliverable assets")
    suggested_share_bps: int = Field(..., ge=0, le=10000, description="Recommended advisory payout split in basis points (0-10000)")

class ArbitratorDossierRequest(BaseModel):
    dispute_id: str = Field(..., description="Unique dispute identifier")
    terms: Union[AgreementTerms, Dict[str, Any]] = Field(..., description="Full agreement terms")
    milestone: Union[MilestoneTerms, Dict[str, Any]] = Field(..., description="Disputed milestone specification")
    submission: Union[SubmissionInfo, Dict[str, Any], str] = Field(..., description="Submitted deliverable details")
    rejection_reason: str = Field(..., description="Reason for milestone rejection")
    evidence: List[str] = Field(default_factory=list, description="List of submitted evidence strings or file descriptions")
    timeline_events: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Indexed on-chain and off-chain dispute events")

class ArbitratorDossierResponse(BaseModel):
    dispute_id: str = Field(..., description="Unique dispute identifier")
    executive_summary: str = Field(..., description="Concise, neutral briefing for the 3 peer arbitrators")
    recommended_share_bps: int = Field(..., ge=0, le=10000, description="Overall recommended freelancer payout share in basis points")
    claims_matrix: List[ClaimEvidenceRow] = Field(default_factory=list, description="Executive Claims vs. Fact matrix breakdown")
    timeline: List[Dict[str, Any]] = Field(default_factory=list, description="Chronological summary of key agreement milestones and events")
    unresolved_questions: List[str] = Field(default_factory=list, description="Ambiguities or questions arbitrators should consider probing")

class ArbitratorQueryRequest(BaseModel):
    dispute_id: str = Field(..., description="Unique dispute identifier")
    question: str = Field(..., description="Arbitrator natural language query about evidence or contract terms")
    context: Dict[str, Any] = Field(default_factory=dict, description="Dispute context including terms, submission, and evidence")

class ArbitratorQueryResponse(BaseModel):
    dispute_id: str = Field(..., description="Unique dispute identifier")
    question: str = Field(..., description="The asked question")
    answer: str = Field(..., description="Objective, evidence-backed answer citing specific contract terms and logs")
    cited_evidence: List[str] = Field(default_factory=list, description="Direct citations and evidence points referenced in the answer")
