from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage
from tools.prompt_loader import load_prompt

llm = ChatOllama(model="qwen2.5-coder:1.5b", temperature=0)

def planner(state):
    print("--- GSD PLANNER ---")
    system_prompt = load_prompt("gsd-planner")
    objective = state["objective"]
    
    # Adicionando instruções de Memória (Claude-Mem) e Superpowers
    memory_guideline = "Você tem acesso a ferramentas de memória (MCP 'memory'). Use 'search', 'timeline' e 'get_observations' para recuperar contextos de sessões passadas se relevante."
    super_guideline = "Use as diretrizes de 'brainstorming.md' e 'planning_details.md' em 'ai-agent/prompts/superpowers/' para refinar este plano."
    
    prompt = f"OBJECTIVE: {objective}\n\n{memory_guideline}\n\n{super_guideline}\n\nCrie um PLAN.md detalhado seguindo as fases GSD."
    
    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=prompt)
    ])
    return {"plan": response.content}
