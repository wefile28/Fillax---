from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App
    APP_ENV: str = "development"
    FRONTEND_URL: str = "http://localhost:3000"

    # Supabase (Required in production, no default so app crashes early if missing)
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str

    # Anthropic (Required for AI assistant)
    ANTHROPIC_API_KEY: str = ""

    # LINE
    LINE_CHANNEL_ACCESS_TOKEN: str = ""
    LINE_CHANNEL_SECRET: str = ""

    # Omise (Payment)
    OMISE_SECRET_KEY: str = ""
    OMISE_PUBLIC_KEY: str = ""
    OMISE_WEBHOOK_SECRET: str = ""

    # Redis Cache (Optional for local development, fallback to in-memory)
    REDIS_URL: str = ""

    class Config:
        env_file = (".env", "../.env")
        extra = "ignore"

settings = Settings()
