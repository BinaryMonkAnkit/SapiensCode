import pytest
from pydantic import ValidationError
from app.ai_chat.services.schemas.chat import ChatPayload
from app.ai_chat.services.core.config import settings

def test_valid_chat_payload():
    """Ensures valid payload structures pass validation cleanly."""
    payload = ChatPayload(
        message="Write a python function",
        current_code="def add(a, b): pass",
        selected_text="def add",
        session_id="session_abc123",
        model_id="groq/gpt-oss-120b"
    )
    assert payload.message == "Write a python function"
    assert payload.session_id == "session_abc123"

def test_control_character_sanitization():
    """Verifies that dangerous control characters (e.g., null bytes) are stripped."""
    payload = ChatPayload(
        message="Hello\x00 World\x07!",
        session_id="valid_session_1",
        model_id="groq/gpt-oss-120b"
    )
    assert payload.message == "Hello World!"

def test_invalid_session_id_characters():
    """Rejects malicious session_ids containing directory traversal or forbidden symbols."""
    invalid_ids = ["../etc/passwd", "session;DROP TABLE", "session space", "session@123"]
    
    for bad_id in invalid_ids:
        with pytest.raises(ValidationError) as exc_info:
            ChatPayload(
                message="Test",
                session_id=bad_id,
                model_id="groq/gpt-oss-120b"
            )
        assert "session_id contains invalid characters" in str(exc_info.value)

def test_message_length_exceeded():
    """Rejects user messages exceeding configured MAX_MESSAGE_CHARS limit."""
    oversized_message = "A" * (settings.MAX_MESSAGE_CHARS + 10)
    
    with pytest.raises(ValidationError):
        ChatPayload(
            message=oversized_message,
            session_id="valid_session",
            model_id="groq/gpt-oss-120b"
        )