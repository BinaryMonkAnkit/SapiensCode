import re
from pydantic import BaseModel, Field, field_validator
from app.ai_chat.services.core.config import settings


class ModelMetaResponse(BaseModel):
    id: str
    name: str


class ChatPayload(BaseModel):
    message: str = Field(..., min_length=1, max_length=settings.MAX_MESSAGE_CHARS, description="User query")
    current_code: str = Field(default="", max_length=20000, description="Active code snippet")
    selected_text: str = Field(default="", max_length=5000, description="Highlighted text")
    session_id: str = Field(..., min_length=1, max_length=128, description="Unique session thread ID")
    model_id: str = Field(..., description="Target LLM model key")

    @field_validator("message", "session_id")
    @classmethod
    def sanitize_strings(cls, v: str) -> str:
        """Strip null bytes and hazardous control characters."""
        cleaned = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F]', '', v).strip()
        if not cleaned:
            raise ValueError("Payload field cannot consist solely of whitespace or control characters.")
        return cleaned

    @field_validator("session_id")
    @classmethod
    def validate_session_id(cls, v: str) -> str:
        """Ensure session ID contains only alphanumeric, hyphen, or underscore characters."""
        if not re.match(r"^[a-zA-Z0-9_\-]+$", v):
            raise ValueError("session_id contains invalid characters. Use alphanumeric, hyphens, or underscores.")
        return v