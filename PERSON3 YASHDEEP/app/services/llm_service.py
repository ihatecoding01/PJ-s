import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
import httpx
from app.config import settings
from app.core.json_repair import parse_robust_json

logger = logging.getLogger("fairwork.llm")

def get_prompts_dir() -> Path:
    """Finds the prompts directory."""
    # Current folder hierarchy: PERSON3 YASHDEEP/app/services -> PERSON3 YASHDEEP/prompts
    current_file = Path(__file__).resolve()
    # Check PERSON3 YASHDEEP/prompts
    p1 = current_file.parent.parent.parent / "prompts"
    if p1.exists():
        return p1
    # Check ai-service/prompts
    p2 = current_file.parent.parent.parent / "ai-service" / "prompts"
    if p2.exists():
        return p2
    # Fallback
    return p1

def load_prompt_template(filename: str) -> str:
    """Reads prompt markdown template from disk."""
    prompts_dir = get_prompts_dir()
    filepath = prompts_dir / filename
    if not filepath.exists():
        raise FileNotFoundError(f"Prompt file not found at {filepath}")
    return filepath.read_text(encoding="utf-8")

class LLMService:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self.api_key = settings.LLM_API_KEY
        self.model = settings.LLM_MODEL
        self.mock = settings.MOCK

    async def call_llm(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 4096,
    ) -> str:
        """
        Executes a call to the configured LLM provider via httpx.
        Supports Anthropic Claude and OpenAI models.
        """
        if self.mock or not self.api_key:
            raise RuntimeError("LLMService called in mock mode or without API key")

        headers: Dict[str, str] = {}
        payload: Dict[str, Any] = {}

        if self.provider == "anthropic":
            url = "https://api.anthropic.com/v1/messages"
            model_name = self.model or "claude-3-5-sonnet-20241022"
            headers = {
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            }
            payload = {
                "model": model_name,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "system": system_prompt,
                "messages": [
                    {"role": "user", "content": user_prompt}
                ]
            }
            async with httpx.AsyncClient(timeout=45.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code != 200:
                    logger.error(f"Anthropic API error: status {resp.status_code}")
                    raise RuntimeError(f"Anthropic API returned status {resp.status_code}: {resp.text}")
                data = resp.json()
                content_blocks = data.get("content", [])
                text_parts = [b.get("text", "") for b in content_blocks if b.get("type") == "text"]
                return "".join(text_parts)

        else:
            # Default to OpenAI
            url = "https://api.openai.com/v1/chat/completions"
            model_name = self.model or "gpt-4o"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": model_name,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            }
            async with httpx.AsyncClient(timeout=45.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code != 200:
                    logger.error(f"OpenAI API error: status {resp.status_code}")
                    raise RuntimeError(f"OpenAI API returned status {resp.status_code}: {resp.text}")
                data = resp.json()
                choices = data.get("choices", [])
                if not choices:
                    raise RuntimeError("OpenAI returned empty choices")
                return choices[0].get("message", {}).get("content", "")

    async def call_llm_json_with_retry(
        self,
        system_prompt: str,
        user_prompt: str,
        validator_func=None,
        max_retries: int = 2,
    ) -> Dict[str, Any]:
        """
        Calls LLM and parses JSON response with up to max_retries attempts
        if JSON parsing fails or custom validator rejects the structure.
        """
        current_user_prompt = user_prompt
        last_error = ""

        for attempt in range(max_retries + 1):
            try:
                raw_response = await self.call_llm(system_prompt, current_user_prompt)
                parsed = parse_robust_json(raw_response)
                if validator_func:
                    validated, errs = validator_func(parsed)
                    if errs:
                        raise ValueError(f"Validation errors: {'; '.join(errs)}")
                    return validated
                return parsed
            except Exception as e:
                last_error = str(e)
                logger.warning(f"LLM call attempt {attempt+1} failed: {last_error}")
                if attempt < max_retries:
                    # Feed back error to LLM for retry
                    current_user_prompt = (
                        f"{user_prompt}\n\n"
                        f"CRITICAL FIX REQUIRED (Attempt {attempt+1} failed):\n"
                        f"Your previous output produced the following error: {last_error}\n"
                        f"Please rectify the errors and return ONLY the corrected, strictly valid JSON."
                    )

        raise RuntimeError(f"Failed to obtain valid JSON from LLM after {max_retries+1} attempts: {last_error}")

llm_service = LLMService()
