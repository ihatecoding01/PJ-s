from typing import List, Optional, Union, Dict, Any
from pydantic import BaseModel, Field
from app.models.common import ThreadMessage, Parties
from app.models.terms import AgreementTerms

class DraftContractRequest(BaseModel):
    thread_messages: List[ThreadMessage] = Field(..., description="Chat messages between client and freelancer")
    post_context: Optional[Union[str, Dict[str, Any]]] = Field(default=None, description="Optional community post context or job description")
    parties: Parties = Field(..., description="Client and Freelancer wallet addresses")

class DraftContractResponse(BaseModel):
    terms: AgreementTerms = Field(..., description="Extracted and validated agreement terms")
    open_questions: List[str] = Field(default_factory=list, description="Unresolved questions for parties")
    warnings: List[str] = Field(default_factory=list, description="Assumptions made or non-critical issues detected")
