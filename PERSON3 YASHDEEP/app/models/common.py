from typing import Optional, Union, Dict, Any
from pydantic import BaseModel, Field

class ErrorDetail(BaseModel):
    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error description")

class ErrorResponse(BaseModel):
    error: ErrorDetail

class ThreadMessage(BaseModel):
    sender: str = Field(..., description="Wallet address or identifier of the sender")
    text: str = Field(..., description="Message text content")
    ts: str = Field(..., description="Timestamp of the message (ISO-8601 or similar)")

class Parties(BaseModel):
    client: str = Field(..., description="Client wallet address (0x...)")
    freelancer: str = Field(..., description="Freelancer wallet address (0x...)")
