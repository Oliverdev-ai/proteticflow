from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage
from tools.prompt_loader import load_prompt

llm = ChatOllama(model="qwen2.5-coder:1.5b", temperature=0)

def executor(state):
    print("--- GSD EXECUTOR ---")
    system_prompt = load_prompt("gsd-executor")
    plan = state["plan"]
    
    # Adicionando instruções de UI/UX e Superpowers (TDD)
    design_guideline = "Você tem acesso a ferramentas de design em 'ai-agent/tools/ui_ux/scripts/search.py'. Se a tarefa envolver UI/UX, use-as para garantir excelência visual."
    super_guideline = "Siga RIGOROSAMENTE as diretrizes de 'tdd.md' em 'ai-agent/prompts/superpowers/'. O ciclo Red-Green-Refactor é obrigatório."
    
    prompt = f"PLAN: {plan}\n\n{design_guideline}\n\n{super_guideline}\n\nExecute as tarefas e retorne o código gerado."
    
    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=prompt)
    ])
    return {"code": response.content}
