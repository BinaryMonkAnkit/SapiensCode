# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Dict, Any

class Settings(BaseSettings):
    # API Keys
    GROQ_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""

    # Available Production Models Configuration
    # Key = ID sent by frontend, Value = Framework configuration
    AVAILABLE_MODELS: Dict[str, Dict[str, Any]] = {
        "groq/gpt-oss-120b": {
            "name": "GPT-OSS 120B (Groq Ultra-Fast Reasoning)",
            "provider": "groq",
            "model_id": "openai/gpt-oss-120b"  # Active Groq replacement
        },
        "groq/qwen-3.6-coder": {
            "name": "Qwen 3.6 27B (Groq Coding Expert)",
            "provider": "groq",
            "model_id": "qwen/qwen3.6-27b"      # Active Groq coding replacement
        },
        "google/gemini-2.5-pro": {
            "name": "Gemini 2.5 Pro (Deep Workspace Reasoning)",
            "provider": "google_genai",
            "model_id": "models/gemini-2.5-pro"
        },
        "google/gemini-3.5-flash": {
            "name": "Gemini 3.5 Flash (Lightweight & Fast)",
            "provider": "google_genai",
            "model_id": "models/gemini-3.5-flash"
        }
    }
    
    # Updated default fallback model identifier to an active model
    DEFAULT_MODEL_ID: str = "groq/gpt-oss-120b"

    # Automatically load values from a .env file if it exists
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
