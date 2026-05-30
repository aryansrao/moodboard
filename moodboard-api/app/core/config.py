from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/moodboard"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    UPSTASH_REDIS_REST_URL: str = ""
    UPSTASH_REDIS_REST_TOKEN: str = ""

    # QStash
    QSTASH_TOKEN: str = ""
    QSTASH_CURRENT_SIGNING_KEY: str = ""
    QSTASH_NEXT_SIGNING_KEY: str = ""

    # Groq AI
    GROQ_API_KEY: str = ""

    # Supabase (Auth + Storage)
    SUPABASE_URL: str = ""
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_SERVICE_KEY: str = ""  # service_role key — backend only, never expose to client

    # API
    API_BASE_URL: str = "http://localhost:8000"
    ENVIRONMENT: str = "development"

    # Instagram (optional)
    INSTAGRAM_ACCESS_TOKEN: str = ""

    @field_validator("DATABASE_URL")
    @classmethod
    def fix_asyncpg_scheme(cls, v: str) -> str:
        # Neon and most providers give postgresql:// — SQLAlchemy async needs postgresql+asyncpg://
        if v.startswith("postgresql://") and "+asyncpg" not in v:
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
