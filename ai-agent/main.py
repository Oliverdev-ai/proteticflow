from graphs.dev_graph import create_dev_graph

def main():
    print("--- INICIANDO AGENTE DEV MODULAR ---")
    
    # Criar o grafo
    app = create_dev_graph()
    
    # Definir input
    inputs = {
        "objective": "Criar uma classe Python para gerenciar um estoque simples.",
        "plan": "",
        "code": "",
        "qa_report": ""
    }
    
    # Executar
    result = app.invoke(inputs)
    
    print("\n--- RESULTADO DA QA ---")
    print(result["qa_report"])
    
    print("\n--- CÓDIGO GERADO ---")
    print(result["code"])

if __name__ == "__main__":
    main()
