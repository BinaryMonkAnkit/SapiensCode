import pytest
import json
from unittest.mock import AsyncMock, patch

# Adjust import according to your folder structure
from app.ai_chat.services.core.config import settings


@pytest.mark.asyncio
async def test_get_available_models(async_client):
    """Tests GET /assistant/models returns the list of supported models."""
    response = await async_client.get("/assistant/models")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Checks if models defined in settings exist in response
    assert len(data) > 0


@pytest.mark.asyncio
async def test_chat_endpoint_unsupported_model(async_client):
    """Rejects chat requests attempting to use non-whitelisted model keys."""
    payload = {
        "message": "Hello",
        "current_code": "",
        "selected_text": "",
        "session_id": "test_session_1",
        "model_id": "invalid/unsupported-model"
    }
    response = await async_client.post("/assistant/chat", json=payload)
    assert response.status_code == 400
    assert "is not supported" in response.json()["detail"]


@pytest.mark.asyncio
async def test_chat_sse_streaming_success(async_client, monkeypatch):
    """Tests SSE streaming endpoint output formatting."""
    class DummyChunk:
        def __init__(self, text):
            self.content = text

    async def mock_astream_events(*args, **kwargs):
        yield {
            "event": "on_chat_model_stream",
            "data": {"chunk": DummyChunk("Hello")}
        }
        yield {
            "event": "on_chat_model_stream",
            "data": {"chunk": DummyChunk(" world!")}
        }

    # Mock the compiled graph's astream_events method
    monkeypatch.setattr(
        "langgraph.graph.state.CompiledStateGraph.astream_events", 
        mock_astream_events
    )

    payload = {
        "message": "Hello",
        "current_code": "",
        "selected_text": "",
        "session_id": "stream_test_session",
        "model_id": list(settings.AVAILABLE_MODELS.keys())[0]  # Uses first valid model ID
    }

    response = await async_client.post("/assistant/chat", json=payload)
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]

    lines = [line.strip() for line in response.text.split("\n") if line.startswith("data: ")]
    assert len(lines) == 2

    chunk_1 = json.loads(lines[0].replace("data: ", ""))
    chunk_2 = json.loads(lines[1].replace("data: ", ""))

    assert chunk_1["content"] == "Hello"
    assert chunk_2["content"] == " world!"


@pytest.mark.asyncio
async def test_chat_sse_rate_limit_error_handling(async_client, monkeypatch):
    """Verifies provider exceptions (e.g. 429 Rate Limit) are caught and yielded as SSE error events."""
    async def mock_failing_stream(*args, **kwargs):
        raise Exception("429 Too Many Requests: Rate Limit Exceeded")
        yield  # Make it an async generator

    monkeypatch.setattr(
        "langgraph.graph.state.CompiledStateGraph.astream_events", 
        mock_failing_stream
    )

    payload = {
        "message": "Heavy prompt",
        "current_code": "",
        "selected_text": "",
        "session_id": "error_test_session",
        "model_id": list(settings.AVAILABLE_MODELS.keys())[0]
    }

    response = await async_client.post("/assistant/chat", json=payload)
    assert response.status_code == 200

    lines = [line.strip() for line in response.text.split("\n") if line.startswith("data: ")]
    assert len(lines) >= 1

    error_payload = json.loads(lines[0].replace("data: ", ""))
    assert "Free-tier API limit reached" in error_payload["error"]