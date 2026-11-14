"""
Thin wrapper around the Groq API. The API key is read from a server-side
environment variable only — it is never sent to or exposed in the frontend.
"""
from typing import Optional
from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

_client = None


def get_client():
    """Lazily initialize the Groq client. Returns None if no API key is configured."""
    global _client
    if not settings.GROQ_API_KEY:
        logger.warning("GROQ_API_KEY is not set. AI-powered features will return a helpful fallback message.")
        return None
    if _client is None:
        from groq import Groq
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


def is_available() -> bool:
    return bool(settings.GROQ_API_KEY)


def generate_text(prompt: str, system_instruction: Optional[str] = None, temperature: float = 0.3) -> str:
    """Simple single-turn text generation with graceful fallback."""
    client = get_client()
    if client is None:
        return ("[AI explanation unavailable: GROQ_API_KEY is not configured on the backend. "
                "Set GROQ_API_KEY in your environment to enable natural-language explanations.]")
    try:
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            temperature=temperature,
            max_completion_tokens=2048,
        )
        text = response.choices[0].message.content if response and response.choices else None
        return text.strip() if text else "No response generated."
    except Exception as e:
        logger.error(f"Groq generation failed: {e}")
        return f"[AI explanation unavailable due to an error: {e}]"
