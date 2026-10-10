from fastapi import APIRouter
from app.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    """Health check endpoint exposing service state and operational configuration."""
    return {
        "status": "ok",
        "service": "fairwork-ai-service",
        "version": "1.0.0",
        "mock": settings.MOCK,
        "provider": settings.LLM_PROVIDER if not settings.MOCK else "mock",
    }
