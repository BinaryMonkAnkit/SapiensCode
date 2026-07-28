import logging
from typing import Annotated, Dict, Any, Optional, Literal, List
from typing_extensions import TypedDict

from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain.chat_models import init_chat_model
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langchain_core.runnables import RunnableConfig
from langchain_core.messages import SystemMessage, BaseMessage, HumanMessage, RemoveMessage

from app.ai_chat.services.core.config import settings

logger = logging.getLogger(__name__)


# 1. State Contract
class AssistantState(TypedDict):
    messages: Annotated[list, add_messages]
    summary: str  # Stores incremental running summary across conversation turns
    current_code: str
    selected_text: str


def sanitize_code_snippet(text: Optional[str], max_chars: int = 4000) -> str:
    if not text:
        return ""
    if len(text) > max_chars:
        return text[:max_chars] + f"\n... [Truncated for prompt safety ({len(text)} total chars)]"
    return text


def get_model_instance(model_key: str, temperature: float = 0.2):
    """Helper to initialize dynamic LLMs with proper keys."""
    if model_key not in settings.AVAILABLE_MODELS:
        model_key = settings.DEFAULT_MODEL_ID
    meta = settings.AVAILABLE_MODELS[model_key]
    api_key = settings.GROQ_API_KEY if meta["provider"] == "groq" else settings.GOOGLE_API_KEY
    
    return init_chat_model(
        model=meta["model_id"],
        model_provider=meta["provider"],
        api_key=api_key,
        temperature=temperature,
        max_tokens=meta.get("max_output_tokens", 2048),
        streaming=True
    )


# --- NODE 1: Main Assistant Response Node ---
def call_model(state: AssistantState, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
    config = config or {}
    configurable = config.get("configurable", {})
    selected_model_key = configurable.get("model_id") or settings.DEFAULT_MODEL_ID

    model = get_model_instance(selected_model_key)

    safe_code = sanitize_code_snippet(state.get("current_code", ""))
    safe_selected = sanitize_code_snippet(state.get("selected_text", ""), max_chars=1000)

    # Base System Prompt
    system_prompt = (
        "You are an expert programming assistant embedded in an online code editor.\n"
        "Provide direct, safe, clean solutions. Always use standard markdown code blocks.\n\n"
    )

    # Prepend accumulated running summary if it exists
    existing_summary = state.get("summary", "")
    if existing_summary:
        system_prompt += f"--- Prior Conversation Context Summary ---\n{existing_summary}\n\n"

    if safe_code:
        system_prompt += f"--- User Active File Context ---\n```\n{safe_code}\n```\n\n"
    if safe_selected:
        system_prompt += f"--- User Selected Code Block ---\n```\n{safe_selected}\n```\n\n"

    # Assemble messages: System prompt + raw messages currently in state
    messages = [SystemMessage(content=system_prompt)] + state.get("messages", [])
    response = model.invoke(messages)

    return {"messages": [response]}


# --- NODE 2: Rolling Conversation Summarizer Node ---
def summarize_conversation(state: AssistantState) -> Dict[str, Any]:
    """
    Compresses older conversation history into state['summary'] and removes 
    the raw messages except for the most recent active window.
    """
    messages = state.get("messages", [])
    existing_summary = state.get("summary", "")

    # Retain the last N messages for active context
    keep_count = settings.RECENT_MESSAGES_TO_KEEP
    messages_to_summarize = messages[:-keep_count]
    
    if not messages_to_summarize:
        return {}

    # Prompt LLM to create/update summary
    if existing_summary:
        prompt = (
            f"Existing Summary:\n{existing_summary}\n\n"
            "Extend the summary above with the following new chat messages. "
            "Focus on code changes, user goals, and decisions made. Keep it concise:"
        )
    else:
        prompt = (
            "Create a concise summary of the following conversation history. "
            "Focus on code changes, technical concepts discussed, and key user requests:"
        )

    # Use lightweight model for summarization to save costs
    summarizer_llm = get_model_instance(settings.SUMMARIZER_MODEL_ID, temperature=0.0)
    summary_input = messages_to_summarize + [HumanMessage(content=prompt)]
    
    summary_response = summarizer_llm.invoke(summary_input)
    new_summary = summary_response.content if isinstance(summary_response.content, str) else str(summary_response.content)

    # Delete old raw messages from LangGraph state using RemoveMessage
    delete_instructions = [RemoveMessage(id=m.id) for m in messages_to_summarize if hasattr(m, "id")]

    logger.info(f"Summarization complete. Removed {len(delete_instructions)} old raw messages.")
    return {
        "summary": new_summary,
        "messages": delete_instructions
    }


# --- CONDITIONAL ROUTER EDGE ---
def should_summarize(state: AssistantState) -> Literal["summarize_conversation", "__end__"]:
    """
    Triggers summarization when message count exceeds configured threshold.
    """
    messages = state.get("messages", [])
    if len(messages) > settings.SUMMARIZE_THRESHOLD:
        return "summarize_conversation"
    return END


# --- BUILD COMPLIANT GRAPH ---
builder = StateGraph(AssistantState)

builder.add_node("assistant", call_model)
builder.add_node("summarize_conversation", summarize_conversation)

builder.add_edge(START, "assistant")
builder.add_conditional_edges("assistant", should_summarize)
builder.add_edge("summarize_conversation", END)


# --- PERSISTENT DB CHECKPOINTER SETUP ---
async def get_compiled_app():
    """
    Compiles the graph using AsyncSqliteSaver for persistent, crash-resilient memory across restarts.
    """
    async with AsyncSqliteSaver.from_conn_string(settings.DB_PATH) as checkpointer:
        await checkpointer.setup()
        app = builder.compile(checkpointer=checkpointer)
        return app