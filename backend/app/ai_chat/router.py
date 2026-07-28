import json
import logging
from typing import List
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from .services.schemas.chat import ModelMetaResponse, ChatPayload
from .services.assistant import builder
from .services.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assistant", tags=["Assistant"])


# 1. GET /assistant/models
@router.get("/models", response_model=List[ModelMetaResponse])
async def get_available_models():
    """Returns supported models for frontend dropdown selection."""
    return [
        ModelMetaResponse(id=key, name=meta["name"])
        for key, meta in settings.AVAILABLE_MODELS.items()
    ]


# 2. POST /assistant/chat
@router.post("/chat")
async def chat_endpoint(payload: ChatPayload):
    """Streams LLM chat completions with session persistence and error safety."""
    
    # Check Whitelist
    if payload.model_id not in settings.AVAILABLE_MODELS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Model '{payload.model_id}' is not supported. Please select a valid model."
        )

    # Prepare Execution Config
    config = {
        "configurable": {
            "thread_id": payload.session_id,
            "model_id": payload.model_id
        }
    }

    # Input state payload
    inputs = {
        "messages": [{"role": "user", "content": payload.message}],
        "current_code": payload.current_code,
        "selected_text": payload.selected_text
    }

    async def event_generator():
        try:
            # Persistent checkpointer connection opened cleanly once per request
            async with AsyncSqliteSaver.from_conn_string(settings.DB_PATH) as checkpointer:
                app = builder.compile(checkpointer=checkpointer)

                async for event in app.astream_events(inputs, config, version="v2"):
                    if event.get("event") == "on_chat_model_stream":
                        chunk_data = event.get("data", {}).get("chunk")
                        if not chunk_data:
                            continue

                        # Extract text across Groq & Gemini providers
                        text_chunk = getattr(chunk_data, "content", str(chunk_data))

                        if isinstance(text_chunk, list):
                            text_chunk = "".join(
                                [part.get("text", "") if isinstance(part, dict) else str(part) for part in text_chunk]
                            )

                        if text_chunk and isinstance(text_chunk, str):
                            yield f"data: {json.dumps({'content': text_chunk})}\n\n"

        except Exception as e:
            logger.error(f"Error during SSE execution: {str(e)}", exc_info=True)
            
            # Map raw API errors into clean user messages
            user_msg = "An unexpected error occurred while generating the response."
            err_str = str(e).lower()

            if "429" in err_str or "quota" in err_str or "rate limit" in err_str:
                user_msg = "Free-tier API limit reached. Please switch models or wait a moment."
            elif "400" in err_str or "context" in err_str:
                user_msg = "Context limit reached. Older history was auto-summarized."
            elif "safety" in err_str or "blocked" in err_str:
                user_msg = "Response flagged by safety filters. Please adjust your request."

            yield f"data: {json.dumps({'error': user_msg})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")