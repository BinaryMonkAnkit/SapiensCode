"""
Production-grade backend: runs submitted code inside a fresh, locked-down
Docker container per run, instead of running the interpreter directly on
the host.

Run with:
    uvicorn app.main:app --port 8000
"""

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from app.code_execution.router import router as terminal_router
from app.ai_chat.router import router as assistant_router

# Initialize the main FastAPI app
app = FastAPI(title="Docker Code Execution Backend")

# Setup CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check router
health_router = APIRouter(tags=["Health"])


@health_router.get("/health")
async def health():
    return {"status": "ok"}


# Mount all routers
app.include_router(health_router)
app.include_router(terminal_router)
app.include_router(assistant_router)