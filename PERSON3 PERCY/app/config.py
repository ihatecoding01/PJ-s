import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()

class Settings:
    # Port & Host
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")

    # Mock mode: returns canned, schema-valid responses without LLM or GitHub calls
    MOCK: bool = os.getenv("MOCK", "false").lower() in ("true", "1", "yes", "t")

    # LLM Configuration
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "openai").lower()  # "anthropic" | "openai" | "gemini"
    LLM_API_KEY: Optional[str] = os.getenv("LLM_API_KEY")
    LLM_MODEL: Optional[str] = os.getenv("LLM_MODEL")  # Optional override

    # GitHub API Configuration
    GITHUB_TOKEN: Optional[str] = os.getenv("GITHUB_TOKEN")

    # Internal Security Key (optional)
    AI_INTERNAL_KEY: Optional[str] = os.getenv("AI_INTERNAL_KEY")

    # Cache TTL for GitHub responses in seconds
    GITHUB_CACHE_TTL_SECONDS: int = int(os.getenv("GITHUB_CACHE_TTL_SECONDS", "300"))

settings = Settings()
