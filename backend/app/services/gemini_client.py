"""
Thin wrapper around Google Generative AI (Gemini). The API key is read
from a server-side environment variable only — it is never sent to or
exposed in the frontend.
"""
from typing import Optional
from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

_model = None
_configured = False


def _ensure_configured():
    global _configured
    if _configured:
        return
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY is not set. AI-powered features will return a helpful fallback message.")
    else:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
    _configured = True


def get_model():
    """Lazily initialize the Gemini model. Returns None if no API key is configured."""
    global _model
    _ensure_configured()
    if not settings.GEMINI_API_KEY:
        return None
    if _model is None:
        import google.generativeai as genai
        _model = genai.GenerativeModel(settings.GEMINI_MODEL)
    return _model


def is_available() -> bool:
    return bool(settings.GEMINI_API_KEY)


def generate_text(prompt: str, system_instruction: Optional[str] = None, temperature: float = 0.3) -> str:
    """Simple single-turn text generation with graceful fallback."""
    model = get_model()
    if model is None:
        return ("[AI explanation unavailable: GEMINI_API_KEY is not configured on the backend. "
                "Set GEMINI_API_KEY in your environment to enable natural-language explanations.]")
    try:
        import google.generativeai as genai
        gen_model = genai.GenerativeModel(
            settings.GEMINI_MODEL,
            system_instruction=system_instruction,
        )
        response = gen_model.generate_content(
            prompt,
            generation_config={"temperature": temperature, "max_output_tokens": 1024},
        )
        return response.text.strip() if response and response.text else "No response generated."
    except Exception as e:
        logger.error(f"Gemini generation failed: {e}")
        return f"[AI explanation unavailable due to an error: {e}]"
