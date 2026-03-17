import os

def load_prompt(name):
    # Caminho absoluto para os prompts
    base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    prompt_path = os.path.join(base_path, "prompts", f"{name}.md")
    
    if os.path.exists(prompt_path):
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    return f"Prompt {name} não encontrado."
