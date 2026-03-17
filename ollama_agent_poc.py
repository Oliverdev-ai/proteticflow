from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage

# 1. Definir o Estado do Agente
class AgentState(TypedDict):
    objective: str
    plan: str
    code: str

# 2. Inicializar o Modelo Local (Ollama)
# Nota: Usando qwen2.5-coder:1.5b (Ultra-Leve para máquinas com 4GB-8GB RAM)
llm = ChatOllama(
    model="qwen2.5-coder:1.5b",
    temperature=0
)

# 3. Definir os Nós (Nodes)
def planner_node(state: AgentState):
    print("--- PLANNER ATUANDO ---")
    objective = state["objective"]
    prompt = f"Crie um plano passo a passo para cumprir este objetivo de programação: {objective}. Seja conciso."
    
    response = llm.invoke([HumanMessage(content=prompt)])
    return {"plan": response.content}

def coder_node(state: AgentState):
    print("--- CODER ATUANDO ---")
    plan = state["plan"]
    prompt = f"Com base neste plano, escreva o código Python necessário:\n\n{plan}\n\nRetorne apenas o código."
    
    response = llm.invoke([HumanMessage(content=prompt)])
    return {"code": response.content}

# 4. Construir o Grafo
workflow = StateGraph(AgentState)

workflow.add_node("planner", planner_node)
workflow.add_node("coder", coder_node)

workflow.add_edge(START, "planner")
workflow.add_edge("planner", "coder")
workflow.add_edge("coder", END)

# 5. Compilar e Executar
app = workflow.compile()

if __name__ == "__main__":
    inputs = {"objective": "Criar uma função que calcule a sequência de Fibonacci até o n-ésimo termo."}
    config = {"configurable": {"thread_id": "1"}}
    
    print("Iniciando fluxo de agentes local...")
    result = app.invoke(inputs, config=config)
    
    print("\n--- PLANO FINAL ---")
    print(result["plan"])
    print("\n--- CÓDIGO FINAL ---")
    print(result["code"])
