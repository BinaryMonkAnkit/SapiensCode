# app/services/assistant.py
from typing import Annotated
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain.chat_models import init_chat_model
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.runnables import RunnableConfig  # Import explicit runner configuration
from app.services.chat_service.core.config import settings

class AssistantState(TypedDict):
    messages: Annotated[list, add_messages]
    current_code: str
    selected_text: str

def call_model(state: AssistantState, config: RunnableConfig = None):
    """
    Executes the LLM step using the runtime configurable model target.
    """
    # Safe instantiation if configuration layer fails to pass downstream
    if config is None:
        config = {}

    # Extract directly from the configurable payload properties context mapping
    configurable = config.get("configurable", {})
    
    # 🔍 BULLETPROOF FIX: Check both payload properties to avoid mapping errors
    selected_model_key = configurable.get("model_id") or configurable.get("model") or settings.DEFAULT_MODEL_ID
    
    print(f"\n[DEBUG RUNTIME] Extracted Model Key inside Node: '{selected_model_key}'")

    if selected_model_key not in settings.AVAILABLE_MODELS:
        print(f"[DEBUG RUNTIME] '{selected_model_key}' not valid. Reverting to default.")
        selected_model_key = settings.DEFAULT_MODEL_ID
        
    model_meta = settings.AVAILABLE_MODELS[selected_model_key]
    print(f"[DEBUG RUNTIME] Routing execution to Provider: '{model_meta['provider']}' -> ID: '{model_meta['model_id']}'")

    # Initialize model dynamically 
    model = init_chat_model(
        model=model_meta["model_id"],
        model_provider=model_meta["provider"],
        temperature=0.2,
        streaming=True
    )

    system_prompt = (
        "You are an expert programming assistant embedded in an online code editor.\n"
        f"The user's current file content is:\n```\n{state['current_code']}\n```\n"
    )
    if state.get('selected_text'):
        system_prompt += f"The user has highlighted this specific code block: '{state['selected_text']}'\n"
        
    system_prompt += "\nProvide direct, clean code solutions. Always use markdown code blocks for code snippets."
    
    messages = [{"role": "system", "content": system_prompt}] + state["messages"]
    response = model.invoke(messages)
    return {"messages": [response]}

# Compile the computational graph architecture identical to earlier steps
builder = StateGraph(AssistantState)
builder.add_node("assistant", call_model)
builder.add_edge(START, "assistant")
builder.add_edge("assistant", END)

memory = MemorySaver()
assistant_app = builder.compile(checkpointer=memory)
