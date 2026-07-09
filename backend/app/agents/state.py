from typing import TypedDict, Annotated, List, Union
from langchain_core.messages import BaseMessage

class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], "The messages in the conversation"]
    user_id: str
    config: dict
    period_start: str
    period_end: str
    kpi_data: dict
    market_context: str
    analysis: dict
    report_markdown: str
    report_id: str
