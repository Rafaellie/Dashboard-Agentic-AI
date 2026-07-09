from langgraph.graph import StateGraph, END
from .state import AgentState
from .nodes import (
    context_loader_node,
    preprocessing_node, 
    context_retrieval_node, 
    strategic_reasoning_node, 
    generation_node,
    persister_node
)
from langgraph.checkpoint.postgres import PostgresSaver
from app.core.config import settings
from psycopg_pool import ConnectionPool
import os

def create_graph():
    # inisialisasi graph state
    workflow = StateGraph(AgentState)

    # daftar node
    workflow.add_node("loader", context_loader_node)
    workflow.add_node("preprocessing", preprocessing_node)
    workflow.add_node("retrieval", context_retrieval_node)
    workflow.add_node("reasoning", strategic_reasoning_node)
    workflow.add_node("generation", generation_node)
    workflow.add_node("persister", persister_node)

    # atur alur edge
    workflow.set_entry_point("loader")
    workflow.add_edge("loader", "preprocessing")
    workflow.add_edge("preprocessing", "retrieval")
    workflow.add_edge("retrieval", "reasoning")
    workflow.add_edge("reasoning", "generation")
    workflow.add_edge("generation", "persister")
    workflow.add_edge("persister", END)

    return workflow

# buat alur kerja workflow sebelum dicompile
workflow = create_graph()

# compile alur kerja dengan penunjuk simpan
db_url = os.environ.get("DATABASE_URL", getattr(settings, "DATABASE_URL", ""))
# compile alur kerja dan tangani checkpoint saver
try:
    from langgraph.checkpoint.memory import MemorySaver
    checkpointer = MemorySaver()
    app_graph = workflow.compile(checkpointer=checkpointer)
except Exception as e:
    print("Warning: MemorySaver failed to initialize.", e)
    app_graph = workflow.compile()
