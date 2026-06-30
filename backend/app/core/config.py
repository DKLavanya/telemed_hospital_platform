import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Advanced Hospital & Telemedicine Platform"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # DB connection string (defaults to SQLite for zero-setup ease of use)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./telemed.db")
    
    # Redis URL (defaults to redis://localhost:6379/0; fallback to mock-in-memory inside services if Redis unavailable)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # AI Config
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")

    # Razorpay Config
    RAZORPAY_KEY_ID: Optional[str] = os.getenv("RAZORPAY_KEY_ID")
    RAZORPAY_KEY_SECRET: Optional[str] = os.getenv("RAZORPAY_KEY_SECRET")

    # SMTP Mail Config
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: Optional[str] = os.getenv("SMTP_USER")
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD")
    EMAILS_FROM_EMAIL: str = os.getenv("EMAILS_FROM_EMAIL", "no-reply@telemed-platform.com")

    def __init__(self, **values):
        super().__init__(**values)
        if not self.SECRET_KEY:
            import secrets
            import logging
            # Generate a secure random key on the fly if not provided
            logging.warning("SECRET_KEY env variable not found. Generating a secure random key in memory.")
            self.SECRET_KEY = secrets.token_hex(32)

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
