import os
import sys
import tempfile
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Ensure the backend root is on sys.path so imports resolve consistently
root_dir = Path(__file__).resolve().parent.parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from main import app
from app.ai_chat.services.core.config import settings


@pytest.fixture(scope="session", autouse=True)
def setup_test_env():
    """Override environment-dependent settings for test isolation."""
    settings.GROQ_API_KEY = "mock_groq_key"
    settings.GOOGLE_API_KEY = "mock_google_key"

    db_fd, db_path = tempfile.mkstemp(suffix="_test.db")
    settings.DB_PATH = db_path

    yield

    os.close(db_fd)
    if os.path.exists(db_path):
        os.remove(db_path)


@pytest_asyncio.fixture(scope="function")
async def async_client():
    """Provide an async HTTP client backed by the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
