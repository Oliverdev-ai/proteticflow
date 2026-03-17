# Manual do Ecossistema AI Agent

Este manual descreve como utilizar o Claude Code, o seu Agente LangGraph modular e a Assistente Antigravity com todas as ferramentas integradas.

---

## 1. Claude Code (Terminal)

O Claude Code é utilizado para tarefas táticas, codificação direta e execução de comandos rápidos.

### Comandos de Atalho (Slash Commands)

- `/commit`: Gera mensagens de commit automáticas e realiza o commit.
- `/context-prime`: Prepara o contexto do projeto para o Claude.
- `/optimize`: Sugere otimizações de performance para o código atual.
- `/todo`: Gerencia as tarefas do projeto.

---

## 2. Assistente Antigravity (Chat Atual)

Eu, Antigravity, agora estou 100% sincronizada com este ecossistema.

- **Conformidade em Tempo Real**: Sigo rigorosamente as diretrizes de **GSD**, **TDD** e **Superpowers** em cada resposta.
- **Acesso a Ferramentas**: Posso usar Playwright, Context7 e Memória através de comandos de sistema para enriquecer nossas interações.
- **Sincronização**: Tudo o que decidirmos aqui será refletido no Contexto do Projeto para que o Claude Code e o Agente local também saibam.

---

## 3. Agente LangGraph (Modular)

Utilizado para tarefas estruturadas e autônomas seguindo a metodologia GSD (Get Shit Done).

### Como Chamar o Agente

No diretório raiz do projeto:

```powershell
cd ai-agent
..\venv\Scripts\python.exe main.py
```

### Dinâmica de Trabalho

1. **Planner**: Cria o plano de ação em `.planning/PLAN.md`.
2. **Executor**: Gera o código seguindo TDD e padrões visuais premium.
3. **Verifier**: Revisa o código e gera um relatório de QA.

---

## 4. Configurações de Ferramentas

As configurações centrais do sistema residem em:

- `.claude/config.json`: Servidores MCP (Filesystem, Git, Memória, Playwright, Context7).
- `ai-agent/prompts/`: Instruções de sistema para os agentes modulares.
- `~/.claude-mem/`: Logs e banco de dados de memória persistente.

---

## 5. Servidores MCP Ativos

- **Filesystem**: Acesso a arquivos locais.
- **Git**: Automação de repositório.
- **Sequential Thinking**: Raciocínio lógico por passos.
- **Memory**: Busca semântica no histórico de sessões.
- **Playwright**: Automação e testes de browser.
- **Context7**: Busca de documentação e APIs atualizadas (Use: "use context7" no prompt).
