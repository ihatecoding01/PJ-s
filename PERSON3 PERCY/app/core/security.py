from typing import Optional
from fastapi import Request, HTTPException, Security, status
from fastapi.security.api_key import APIKeyHeader
from app.config import settings

INTERNAL_KEY_HEADER = APIKeyHeader(name="X-Internal-Key", auto_error=False)

def sanitize_untrusted_text(text: str, max_chars: int = 8000) -> str:
    """
    Sanitizes untrusted text input to prevent delimiter breakout:
    - Escapes closing XML-style tags that could break sandbox delimiters
    - Truncates oversized input
    """
    if not text:
        return ""
    
    # Neutralize closing delimiter escapes
    safe = text.replace("</untrusted_input>", "<\\/untrusted_input>")
    safe = safe.replace("</untrusted_content>", "<\\/untrusted_content>")
    
    if len(safe) > max_chars:
        safe = safe[:max_chars] + f"\n... [TRUNCATED: Exceeded max allowed size of {max_chars} characters]"
        
    return safe

def wrap_untrusted_content(content: str, source: str = "user_input", max_chars: int = 8000) -> str:
    """
    Wraps untrusted user/external text in XML delimiters with explicit untrusted metadata.
    This prevents prompt injection from breaking out of text context into system instructions.
    """
    clean_text = sanitize_untrusted_text(content, max_chars=max_chars)
    return f'<untrusted_input source="{source}">\n{clean_text}\n</untrusted_input>'

async def verify_internal_key(request: Request) -> None:
    """
    FastAPI security dependency to verify X-Internal-Key header if AI_INTERNAL_KEY is configured.
    If AI_INTERNAL_KEY is not configured or empty, allows request through.
    """
    required_key = settings.AI_INTERNAL_KEY
    if not required_key:
        return  # No authentication required in dev/mock if not set
    
    header_key = request.headers.get("X-Internal-Key")
    if not header_key or header_key != required_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Invalid or missing internal key"}
        )
