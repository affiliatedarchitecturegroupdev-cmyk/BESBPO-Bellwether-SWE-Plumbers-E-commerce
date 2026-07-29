from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    api_base_url: str = "http://bellwetherswe-api:3001"
    port: int = 8000
    # No Sentry project exists for this service yet — same situation as
    # apps/api's SENTRY_DSN. None (unset) means error tracking is simply
    # off; see main.py's sentry_sdk.init call, which only runs when this
    # is actually configured.
    sentry_dsn: str | None = None
    sentry_environment: str = "production"
    # No real Anthropic account is configured for this project yet — same
    # situation as sentry_dsn above. None means estimate_service's LLM-based
    # classification is simply skipped in favor of its rule-based fallback;
    # see llm_client.py and estimate_service.classify.
    anthropic_api_key: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
