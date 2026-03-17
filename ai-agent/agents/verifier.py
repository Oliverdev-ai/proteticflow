from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage
from tools.prompt_loader import load_prompt

llm = ChatOllama(model="qwen2.5-coder:1.5b", temperature=0)

def verifier(state):
    print("--- GSD VERIFIER ---")
    system_prompt = load_prompt("gsd-verifier")
    code = state["code"]
    
    # Adicionando instruções de Superpowers (Code Review)
    super_guideline = "Use as diretrizes de 'code-review.md' em 'ai-agent/prompts/superpowers/' para realizar uma revisão técnica rigorosa."
    
    prompt = f"CODE: {code}\n\n{super_guideline}\n\nRealize a verificação e gere o relatório de QA."
    
    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=prompt)
    ])
    return {"qa_report": response.content}
