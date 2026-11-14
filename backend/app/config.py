"""
Central application configuration.
All secrets/config are loaded from environment variables so the app
is deployment-friendly (Render for backend, Vercel for frontend).
Never hardcode secrets here.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- Core ---
    APP_NAME: str = "AI Business Analyst"
    ENV: str = "development"
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # --- Database ---
    # Production uses Supabase Postgres: set DATABASE_URL to the connection
    # string from Supabase (Project Settings > Database > Connection string).
    # Falls back to local SQLite for zero-config local development.
    DATABASE_URL: str = "sqlite:///./ai_business_analyst.db"

    # --- Groq (LLM reasoning) ---
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    # --- Resend (email) ---
    RESEND_API_KEY: str = ""
    ALERT_FROM_EMAIL: str = "alerts@yourdomain.com"

    # --- CORS ---
    FRONTEND_ORIGINS: str = "http://localhost:5173,https://localhost:5173"

    # --- Uploads ---
    MAX_UPLOAD_MB: int = 25
    UPLOAD_DIR: str = "./uploads"

    # --- Automation scheduler ---
    ENABLE_SCHEDULER: bool = True

    @property
    def cors_origins(self) -> List[str]:
        origins = [o.strip() for o in self.FRONTEND_ORIGINS.split(",") if o.strip()]
        return origins


settings = Settings()
