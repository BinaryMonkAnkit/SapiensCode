import sys
import os
import tempfile
from pathlib import Path
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

# ------------------------------------------------------------------
# 1. DYNAMIC ROOT PATH RESOLUTION
# Ensures 'app' and 'ai_chat' modules are discoverable from anywhere
# ------------------------------------------------------------------
root_dir = Path(__file__).resolve().parent.parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

# Import your FastAPI app instance and settings after path resolution
from main import app  # Change to `from main import app` if main.py is in root
from app.ai_chat.services.core.config import settings


# ------------------------------------------------------------------
# 2. ISOLATED TEST ENVIRONMENT FIXTURE
# ------------------------------------------------------------------
@pytest.fixture(scope="session", autouse=True)
def setup_test_env():
    """
    Overrides environment variables and creates a temporary SQLite DB
    so test runs never pollute or touch production data.
    """
    settings.GROQ_API_KEY = "mock_groq_key"
    settings.GOOGLE_API_KEY = "mock_google_key"

    # Create isolated temp DB for session state tests
    db_fd, db_path = tempfile.mkstemp(suffix="_test.db")
    settings.DB_PATH = db_path

    yield

    # Clean up temp DB after all tests finish
    os.close(db_fd)
    if os.path.exists(db_path):
        os.remove(db_path)


# ------------------------------------------------------------------
# 3. ASYNC HTTP CLIENT FIXTURE
# ------------------------------------------------------------------
@pytest_asyncio.fixture(scope="function")
async def async_client():
    """
    Async HTTP client fixture configured with ASGI transport for testing
    FastAPI router endpoints directly in memory.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client