# app/api/assistant.py
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.chat_service.assistant import assistant_app
from app.services.chat_service.core.config import settings
from typing import List, Dict

router = APIRouter(prefix="/assistant", tags=["Assistant"])

# API Schemas
class ModelMetaResponse(BaseModel):
    id: str
    name: str

class ChatPayload(BaseModel):
    message: str
    current_code: str
    selected_text: str = ""
    session_id: str
    model_id: str  # The unique string identifier passed from React client dropdown

@router.get("/models", response_model=List[ModelMetaResponse])
async def get_available_models():
    """
    Endpoint for the React client to populate its dropdown menu dynamically.
    """
    return [
        ModelMetaResponse(id=key, name=meta["name"])
        for key, meta in settings.AVAILABLE_MODELS.items()
    ]

@router.post("/chat")
async def chat_endpoint(payload: ChatPayload):
    if payload.model_id not in settings.AVAILABLE_MODELS:
        raise HTTPException(status_code=400, detail=f"Model '{payload.model_id}' is not supported.")

    # Pass BOTH thread execution memory context AND the selected model parameters
    config = {
        "configurable": {
            "thread_id": payload.session_id,
            "model_id": payload.model_id
        }
    }
    
    inputs = {
        "messages": [{"role": "user", "content": payload.message}],
        "current_code": payload.current_code,
        "selected_text": payload.selected_text
    }

    async def event_generator():
        async for event in assistant_app.astream_events(inputs, config, version="v2"):
            # 1. Capture streaming updates directly from the chat model node
            if event["event"] == "on_chat_model_stream":
                chunk_data = event["data"]["chunk"]
                
                # Check if the chunk data exists
                if chunk_data:
                    # 🔍 PRODUCTION-GRADE PROTECTION:
                    # Extract string directly based on whether it is a content block or raw message object
                    if hasattr(chunk_data, "content"):
                        text_chunk = chunk_data.content
                    else:
                        text_chunk = str(chunk_data)

                    # If the content is returned as a list (common with Gemini metadata), join it back to text
                    if isinstance(text_chunk, list):
                        # Safely combine parts if Gemini packs multiple content fragments
                        text_chunk = "".join([part.get("text", "") if isinstance(part, dict) else str(part) for part in text_chunk])

                    # Only yield if there is actual text to stream back to the React UI
                    if text_chunk and isinstance(text_chunk, str):
                        yield text_chunk

    return StreamingResponse(event_generator(), media_type="text/event-stream")
