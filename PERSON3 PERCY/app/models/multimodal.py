from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

class VerdictEnum(str, Enum):
    SUPPORTED = "SUPPORTED"
    UNCLEAR = "UNCLEAR"
    NOT_DEMONSTRATED = "NOT_DEMONSTRATED"
    CHECK_FAILED = "CHECK_FAILED"

class CriterionVerdict(BaseModel):
    criterion: str = Field(..., description="The evaluated milestone acceptance criterion")
    verdict: VerdictEnum = Field(..., description="Objective 4-state verdict")
    evidence: str = Field(..., description="Concrete citation or justification from deliverable content")

class MultimodalVerifyRequest(BaseModel):
    deliverable_type: str = Field(default="DESIGN", description="'DESIGN', 'DOCUMENT', 'URL', or 'CODE'")
    deliverable_content: str = Field(..., description="Text summary, deliverable URL, image notes, or documentation")
    milestone_title: str = Field(..., description="Title of the milestone being verified")
    milestone_description: Optional[str] = Field(default="", description="Detailed milestone scope description")
    acceptance_criteria: List[str] = Field(..., min_length=1, description="List of acceptance criteria to check")
    required_progress_bps: Optional[int] = Field(default=8000, ge=0, le=10000, description="Minimum progress threshold in basis points")

class MultimodalVerifyResponse(BaseModel):
    overall_progress_bps: int = Field(..., ge=0, le=10000, description="Estimated deliverable completeness (0 - 10,000)")
    quality_score: int = Field(..., ge=0, le=100, description="Objective quality rating (0 - 100)")
    summary: str = Field(..., description="Advisory summary of the multimodal audit")
    criteria_verdicts: List[CriterionVerdict] = Field(default_factory=list, description="Per-criterion 4-state verdicts")
    tests_passing: bool = Field(default=True, description="Whether deliverable passes minimum acceptable requirements")
