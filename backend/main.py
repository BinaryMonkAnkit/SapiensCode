"""
Production-grade backend: runs submitted code inside a fresh, locked-down
Docker container per run, instead of running the interpreter directly on
the host.

Run with:
    uvicorn app.main:app --port 8000
"""
import uvicorn
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from app.code_execution.router import router as terminal_router
from app.ai_chat.router import router as assistant_router

# Initialize the main FastAPI app
app = FastAPI(
    title="Online Code Editor with AI Assistance",
    version="1.0.0",
    description="Production-ready FastAPI services")

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



if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)