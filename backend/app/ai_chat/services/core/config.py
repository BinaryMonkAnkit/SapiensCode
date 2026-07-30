from typing import Dict, Any, List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        env_prefix="",
    )

    # --- API Keys ---
    GROQ_API_KEY: str = Field(default="", alias="GROQ_API_KEY")
    GOOGLE_API_KEY: str = Field(default="", alias="GOOGLE_API_KEY")

    # --- Database Persistence ---
    # Path for SQLite checkpointer (replace with Postgres URL for multi-worker production)
    DB_PATH: str = Field(default="chat_state.db", description="Database file path for checkpointer storage.")

    # --- Safety & Validation Guardrails ---
    MAX_MESSAGE_CHARS: int = Field(default=8000, description="Max char limit per user message.")
    
    # --- Context & Summarization Boundaries ---
    # Active window: Number of raw messages to retain in state for immediate conversation
    RECENT_MESSAGES_TO_KEEP: int = Field(default=6, description="Keep last N raw messages un-summarized.")
    
    # Trigger threshold: Fire summarizer when raw messages exceed this count
    SUMMARIZE_THRESHOLD: int = Field(default=12, description="Trigger summary when message count exceeds this threshold.")

    ALLOWED_ROLES: List[str] = Field(default=["user", "assistant", "system"])

    # --- Models ---
    AVAILABLE_MODELS: Dict[str, Dict[str, Any]] = {
        "groq/gpt-oss-120b": {
            "name": "GPT-OSS 120B (Groq Ultra-Fast Reasoning)",
            "provider": "groq",
            "model_id": "openai/gpt-oss-120b",
            "max_output_tokens": 2048,
        },
        "groq/qwen-3.6-coder": {
            "name": "Qwen 3.6 27B (Groq Coding Expert)",
            "provider": "groq",
            "model_id": "qwen/qwen3.6-27b",
            "max_output_tokens": 2048,
        },
        "google/gemini-2.5-pro": {
            "name": "Gemini 2.5 Pro (Deep Workspace Reasoning)",
            "provider": "google_genai",
            "model_id": "models/gemini-2.5-pro",
            "max_output_tokens": 4096,
        },
        "google/gemini-3.5-flash": {
            "name": "Gemini 3.5 Flash (Lightweight & Fast)",
            "provider": "google_genai",
            "model_id": "models/gemini-3.5-flash",
            "max_output_tokens": 4096,
        }
    }

    DEFAULT_MODEL_ID: str = "groq/gpt-oss-120b"
    # Fast lightweight model for background summarization calls
    SUMMARIZER_MODEL_ID: str = "google/gemini-3.5-flash"


settings = Settings()