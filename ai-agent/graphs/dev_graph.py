from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from agents.planner import planner
from agents.executor import executor
from agents.verifier import verifier

class AgentState(TypedDict):
    objective: str
    plan: str
    code: str
    qa_report: str

def create_dev_graph():
    workflow = StateGraph(AgentState)

    workflow.add_node("planner", planner)
    workflow.add_node("executor", executor)
    workflow.add_node("verifier", verifier)

    workflow.add_edge(START, "planner")
    workflow.add_edge("planner", "executor")
    workflow.add_edge("executor", "verifier")
    workflow.add_edge("verifier", END)

    return workflow.compile()
