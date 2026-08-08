import sys

import asyncio

import os
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv


from app.code_execution.router import router as terminal_router
from dotenv import load_dotenv
from app.ai_chat.router import router as assistant_router

load_dotenv()

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS")

app = FastAPI(
    title="Online Code Editor with AI Assistance",
    version="1.0.0",
    description="Production-ready FastAPI services",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

health_router = APIRouter(tags=["Health"])


@health_router.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(health_router)
app.include_router(terminal_router)
app.include_router(assistant_router)


if __name__ == "__main__":
    if sys.platform == "win32":
        # uvicorn's --reload forces SelectorEventLoop on Windows, which cannot
        # spawn subprocesses (needed for the Docker sandbox runner). Run the
        # server via a ProactorEventLoop directly instead of uvicorn.run(reload=True).
        from uvicorn import Config, Server

        class ProactorServer(Server):
            def run(self, sockets=None):
                loop = asyncio.ProactorEventLoop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(self.serve(sockets=sockets))

        config = Config("main:app", host="0.0.0.0", port=8000, reload=False)
        ProactorServer(config=config).run()
    else:
        import uvicorn

        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
