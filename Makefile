# ProteticFlow - Makefile para automação completa de deploy e gerenciamento

.PHONY: help build start stop restart logs status clean deploy-prod deploy-staging backup restore test-all

# Configurações
COMPOSE_FILE = docker-compose.yml
COMPOSE_STAGING = docker-compose.staging.yml
PROJECT_NAME = proteticflow
STAGING_URL = http://localhost:8080

# Cores para output
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m

help: ## Mostrar esta ajuda
	@echo "$(GREEN)ProteticFlow - Comandos Disponíveis:$(NC)"
	@echo ""
	@echo "$(YELLOW)=== PRODUÇÃO ===$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*PROD.*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-25s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)=== STAGING ===$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*STAGING.*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-25s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)=== TESTES ===$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*TEST.*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-25s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)=== UTILITÁRIOS ===$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## (?!.*(PROD|STAGING|TEST)).*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-25s$(NC) %s\n", $$1, $$2}'

# ==================== PRODUÇÃO ====================

build: ## Build das imagens Docker
	docker-compose -f $(COMPOSE_FILE) build

start: ## Iniciar todos os serviços
	docker-compose -f $(COMPOSE_FILE) up -d

stop: ## Parar todos os serviços
	docker-compose -f $(COMPOSE_FILE) down

restart: ## Reiniciar todos os serviços
	docker-compose -f $(COMPOSE_FILE) restart

logs: ## Ver logs de todos os serviços
	docker-compose -f $(COMPOSE_FILE) logs -f

status: ## Verificar status dos containers
	docker-compose -f $(COMPOSE_FILE) ps

clean: ## Limpar containers e volumes
	docker-compose -f $(COMPOSE_FILE) down -v
	docker system prune -f

deploy-prod: ## PROD - Deploy para produção
	@echo "$(GREEN)Executando deploy para produção...$(NC)"
	./scripts/deploy.sh

backup: ## Fazer backup do banco de dados
	./scripts/backup.sh

restore: ## Restaurar backup do banco de dados
	./scripts/backup.sh restore $(BACKUP_FILE)

# ==================== STAGING ====================

build-staging: ## STAGING - Build das imagens para staging
	docker-compose -f $(COMPOSE_STAGING) build --no-cache

start-staging: ## STAGING - Iniciar ambiente de staging
	@echo "$(GREEN)Iniciando ambiente de staging...$(NC)"
	docker-compose -f $(COMPOSE_STAGING) up -d
	@echo "$(GREEN)Aguardando serviços ficarem prontos...$(NC)"
	@sleep 30
	@echo "$(GREEN)Staging disponível em: $(STAGING_URL)$(NC)"

stop-staging: ## STAGING - Parar ambiente de staging
	docker-compose -f $(COMPOSE_STAGING) down

restart-staging: ## STAGING - Reiniciar ambiente de staging
	docker-compose -f $(COMPOSE_STAGING) restart

logs-staging: ## STAGING - Ver logs do staging
	docker-compose -f $(COMPOSE_STAGING) logs -f

status-staging: ## STAGING - Status dos containers de staging
	docker-compose -f $(COMPOSE_STAGING) ps

clean-staging: ## STAGING - Limpar ambiente de staging
	docker-compose -f $(COMPOSE_STAGING) down -v
	docker system prune -f

deploy-staging: ## STAGING - Deploy completo do staging
	@echo "$(GREEN)🚀 Executando deploy completo do staging...$(NC)"
	@echo "$(YELLOW)1. Limpando ambiente anterior...$(NC)"
	$(MAKE) clean-staging
	@echo "$(YELLOW)2. Construindo imagens...$(NC)"
	$(MAKE) build-staging
	@echo "$(YELLOW)3. Iniciando serviços...$(NC)"
	$(MAKE) start-staging
	@echo "$(YELLOW)4. Executando migrações...$(NC)"
	$(MAKE) migrate-staging
	@echo "$(YELLOW)5. Populando dados de teste...$(NC)"
	$(MAKE) seed-staging
	@echo "$(GREEN)✅ Deploy de staging concluído!$(NC)"
	@echo "$(GREEN)🌐 Acesse: $(STAGING_URL)$(NC)"
	@echo "$(GREEN)👤 Admin: admin / staging123$(NC)"

migrate-staging: ## STAGING - Executar migrações no staging
	docker-compose -f $(COMPOSE_STAGING) exec web python manage.py migrate

seed-staging: ## STAGING - Popular dados de teste (superusuário via entrypoint)
	@docker-compose -f $(COMPOSE_STAGING) exec web python manage.py shell -c "\
from django.contrib.auth import get_user_model; \
User = get_user_model(); \
u, c = User.objects.get_or_create(username='admin', defaults={'email': 'admin@staging.proteticflow.com'}); \
u.set_password('staging123'); u.is_staff = u.is_superuser = True; u.save(); \
print('Admin: admin / staging123' if c else 'Admin já existe')"

backup-staging: ## STAGING - Backup do banco de staging
	docker-compose -f $(COMPOSE_STAGING) exec db pg_dump -U $${DB_USER:-postgres_staging} $${DB_NAME:-proteticflow_staging} > backup_staging_$$(date +%Y%m%d_%H%M%S).sql

restore-staging: ## STAGING - Restaurar backup no staging
	@if [ -z "$(BACKUP_FILE)" ]; then echo "$(RED)Uso: make restore-staging BACKUP_FILE=arquivo.sql$(NC)"; exit 1; fi
	docker-compose -f $(COMPOSE_STAGING) exec -T db psql -U $${DB_USER:-postgres_staging} -d $${DB_NAME:-proteticflow_staging} < $(BACKUP_FILE)

# ==================== TESTES ====================

test-all: ## TEST - Executar todos os testes
	@echo "$(GREEN)🧪 Executando suíte completa de testes...$(NC)"
	chmod +x scripts/run_all_tests.sh
	./scripts/run_all_tests.sh

test-e2e: ## TEST - Testes end-to-end
	@echo "$(GREEN)🎭 Executando testes E2E...$(NC)"
	docker-compose -f $(COMPOSE_STAGING) up -d selenium-hub selenium-chrome
	@sleep 10
	pytest tests/e2e/ -v --html=test-reports/e2e_report.html --self-contained-html

test-api: ## TEST - Testes de API
	@echo "$(GREEN)🔗 Executando testes de API...$(NC)"
	pytest tests/integration/ -v --html=test-reports/api_report.html --self-contained-html

test-performance: ## TEST - Testes de performance
	@echo "$(GREEN)⚡ Executando testes de performance...$(NC)"
	python tests/performance/lighthouse_test.py

test-security: ## TEST - Testes de segurança
	@echo "$(GREEN)🔒 Executando testes de segurança...$(NC)"
	python tests/security/test_security_validation.py

test-load: ## TEST - Testes de carga
	@echo "$(GREEN)🔥 Executando testes de carga...$(NC)"
	locust -f tests/performance/test_load_testing.py --host=$(STAGING_URL) --users=10 --spawn-rate=2 --run-time=60s --html=test-reports/load_test.html --headless

test-smoke: ## TEST - Smoke tests básicos
	@echo "$(GREEN)💨 Executando smoke tests...$(NC)"
	@curl -f $(STAGING_URL)/api/health/ || (echo "$(RED)❌ Health check falhou$(NC)" && exit 1)
	@curl -f $(STAGING_URL)/ || (echo "$(RED)❌ Frontend não responde$(NC)" && exit 1)
	@echo "$(GREEN)✅ Smoke tests passaram$(NC)"

# ==================== MONITORAMENTO ====================

monitor: ## Abrir dashboard de monitoramento
	@echo "$(GREEN)📊 Abrindo Grafana...$(NC)"
	@echo "$(YELLOW)URL: http://localhost:3000$(NC)"
	@echo "$(YELLOW)User: admin / Password: grafana_staging_2024$(NC)"
	@python -c "import webbrowser; webbrowser.open('http://localhost:3000')" 2>/dev/null || true

metrics: ## Ver métricas do Prometheus
	@echo "$(GREEN)📈 Abrindo Prometheus...$(NC)"
	@echo "$(YELLOW)URL: http://localhost:9090$(NC)"
	@python -c "import webbrowser; webbrowser.open('http://localhost:9090')" 2>/dev/null || true

health-check: ## Verificar saúde do sistema
	@echo "$(GREEN)🏥 Verificando saúde do sistema...$(NC)"
	@echo "$(YELLOW)Frontend:$(NC)"
	@curl -s -o /dev/null -w "  Status: %{http_code} | Tempo: %{time_total}s\n" $(STAGING_URL)/ || echo "  $(RED)❌ Falhou$(NC)"
	@echo "$(YELLOW)API Health:$(NC)"
	@curl -s -o /dev/null -w "  Status: %{http_code} | Tempo: %{time_total}s\n" $(STAGING_URL)/api/health/ || echo "  $(RED)❌ Falhou$(NC)"
	@echo "$(YELLOW)Admin:$(NC)"
	@curl -s -o /dev/null -w "  Status: %{http_code} | Tempo: %{time_total}s\n" $(STAGING_URL)/admin/ || echo "  $(RED)❌ Falhou$(NC)"

# ==================== UTILITÁRIOS ====================

shell-backend: ## Abrir shell no container backend
	docker-compose -f $(COMPOSE_STAGING) exec backend bash

shell-db: ## Abrir shell no PostgreSQL
	docker-compose -f $(COMPOSE_STAGING) exec postgres psql -U proteticflow_user -d proteticflow_staging

shell-redis: ## Abrir shell no Redis
	docker-compose -f $(COMPOSE_STAGING) exec redis redis-cli

clean-logs: ## Limpar logs antigos
	@echo "$(GREEN)🧹 Limpando logs antigos...$(NC)"
	find logs/ -name "*.log" -mtime +7 -delete 2>/dev/null || true
	find test-reports/ -name "*.html" -mtime +7 -delete 2>/dev/null || true
	find test-reports/ -name "*.json" -mtime +7 -delete 2>/dev/null || true
	@echo "$(GREEN)✅ Logs limpos$(NC)"

clean-all: ## Limpeza completa (produção + staging)
	@echo "$(YELLOW)⚠️  Limpeza completa - isso irá remover TODOS os dados!$(NC)"
	@read -p "Tem certeza? [y/N] " -n 1 -r; echo; if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(MAKE) clean; \
		$(MAKE) clean-staging; \
		docker volume prune -f; \
		docker network prune -f; \
		echo "$(GREEN)✅ Limpeza completa concluída$(NC)"; \
	else \
		echo "$(YELLOW)Operação cancelada$(NC)"; \
	fi

install-deps: ## Instalar dependências do sistema
	@echo "$(GREEN)📦 Instalando dependências...$(NC)"
	pip install -r labmanager_source/requirements.staging.txt
	npm install --prefix frontend/labmanager-frontend

update: ## Atualizar código e rebuild
	@echo "$(GREEN)🔄 Atualizando sistema...$(NC)"
	git pull
	$(MAKE) build-staging
	$(MAKE) restart-staging

# ==================== INFORMAÇÕES ====================

info: ## Mostrar informações do ambiente
	@echo "$(GREEN)ℹ️  Informações do Ambiente$(NC)"
	@echo "$(YELLOW)Projeto:$(NC) $(PROJECT_NAME)"
	@echo "$(YELLOW)Staging URL:$(NC) $(STAGING_URL)"
	@echo "$(YELLOW)Compose Files:$(NC)"
	@echo "  - Produção: $(COMPOSE_FILE)"
	@echo "  - Staging: $(COMPOSE_STAGING)"
	@echo "$(YELLOW)Containers Ativos:$(NC)"
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep proteticflow || echo "  Nenhum container ativo"
	@echo "$(YELLOW)Volumes:$(NC)"
	@docker volume ls | grep proteticflow || echo "  Nenhum volume encontrado"

docs: ## Abrir documentação
	@echo "$(GREEN)📚 Abrindo documentação...$(NC)"
	@if [ -f "GUIA_STAGING_COMPLETO.md" ]; then \
		echo "$(YELLOW)Documentação disponível em: GUIA_STAGING_COMPLETO.md$(NC)"; \
	else \
		echo "$(RED)❌ Documentação não encontrada$(NC)"; \
	fi

# ==================== ALIASES ====================

up: start-staging ## Alias para start-staging
down: stop-staging ## Alias para stop-staging
ps: status-staging ## Alias para status-staging
test: test-all ## Alias para test-all

