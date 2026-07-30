import pytest
from langchain_core.messages import HumanMessage, AIMessage
from app.ai_chat.services.assistant import sanitize_code_snippet, should_summarize
from app.ai_chat.services.core.config import settings
from langgraph.graph import END

def test_code_snippet_truncation():
    """Ensures oversized code snippets are truncated to safeguard free-tier token budgets."""
    huge_code = "print('hello')\n" * 1000  # Large string
    truncated = sanitize_code_snippet(huge_code, max_chars=500)
    
    assert len(truncated) <= 600
    assert "[Truncated for prompt safety" in truncated

def test_should_summarize_conditional_edge():
    """Tests graph routing logic for triggering conversation summarization."""
    # Under threshold -> Do NOT summarize
    under_threshold_state = {
        "messages": [HumanMessage(content=f"msg {i}") for i in range(settings.SUMMARIZE_THRESHOLD - 1)]
    }
    assert should_summarize(under_threshold_state) == END

    # Exceeds threshold -> Trigger summarize_conversation node
    over_threshold_state = {
        "messages": [HumanMessage(content=f"msg {i}") for i in range(settings.SUMMARIZE_THRESHOLD + 2)]
    }
    assert should_summarize(over_threshold_state) == "summarize_conversation"