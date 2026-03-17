# ProteticFlow – Documentação definitiva (homologação e estado atual)

**Última atualização:** março de 2025  
**Objetivo:** documento único que reflete o estado atual do projeto e o processo de homologação (staging).

---

## 1. Visão geral do projeto

- **Nome:** ProteticFlow (marca comercial / documentação interna também referida como DentalFlow).
- **Função:** sistema de gestão para laboratórios de prótese dentária (clientes, trabalhos, financeiro, scans, IA, agendamento, relatórios).
- **Stack:** Backend Django 4.2+ (DRF, JWT, Celery), Frontend React (Vite, Tailwind), PostgreSQL, Redis, Nginx, Docker.

Todo desenvolvimento ativo está em:

| Caminho | Conteúdo |
|--------|----------|
| `labmanager_source/` | Backend Django (API, modelos, migrações, `manage.py`). Comandos `python manage.py` e testes do backend são executados **dentro desta pasta**. |
| `frontend/labmanager-frontend/` | Frontend React. Comandos `npm install`, `npm run dev` e build são executados **dentro desta pasta**. |

Arquivos avulsos na raiz do repositório (fora dessas duas pastas) não fazem parte da base de código ativa.

---

## 2. Estrutura atual do backend (`labmanager_source/`)

### 2.1 Aplicações Django (estado atual)

- **accounts** – Autenticação, perfis, papéis (roles), 2FA, exportação de dados (LGPD).
- **apps.core** – Health check e status da API.
- **apps.clients** – Clientes (dentistas/clínicas).
- **apps.jobs** – Trabalhos (ordens de serviço).
- **apps.pricing** – Tabelas de preços e serviços.
- **apps.licensing** – Licenciamento.
- **apps.materials** – Materiais e estoque.
- **apps.employees** – Colaboradores, perfis, comissões, atribuições.
- **apps.financial** – Financeiro, contas a receber, fechamentos, tarefas Celery.
- **apps.scans** – Scans 3D (upload XML iTero, STL, casos).
- **ai_assistant** – Assistente Flow (comandos em linguagem natural).
- **payroll** – Folha de pagamento.
- **access_control** – Controle de acesso e permissões.
- **dashboard** – Dashboard e indicadores.
- **intelligent_scheduling** – Agendamento inteligente (ML).
- **predictive_analytics** – Análise preditiva.
- **automated_support** – Suporte automatizado.
- **smart_orders** – Ordens inteligentes.
- **auditlog** – Auditoria de alterações (terceiros).

### 2.2 Papéis de usuário (CustomUser)

Modelo: `accounts.models.CustomUser`. Valor no banco para papel de gerente: **`'gerente'`** (minúsculo).

| Role (valor no BD) | Descrição |
|--------------------|-----------|
| `superadmin` | Super administrador |
| `gerente` | Gerente |
| `recepcao` | Recepção |
| `producao` | Linha de produção |
| `contabil` | Contábil |

Regras relevantes: criação de usuários e funções sensíveis restritas a `superadmin` e `gerente`; 2FA obrigatório para `superadmin` e `gerente` no login.

### 2.3 API v1 – Base e principais prefixos

Base: **`/api/v1/`**.

| Prefixo | App | Observação |
|---------|-----|------------|
| (incluído em `api/v1/`) | apps.core | `health/`, `status/` |
| (incluído em `api/v1/`) | accounts | auth (login, logout, 2FA, export-my-data, users, profile, permissions) |
| `api/v1/ai-assistant/` | ai_assistant | Assistente Flow |
| `api/v1/payroll/` | payroll | Folha |
| (incluído em `api/v1/`) | apps.clients | clients |
| (incluído em `api/v1/`) | apps.pricing | pricing |
| (incluído em `api/v1/`) | apps.jobs | jobs |
| (incluído em `api/v1/`) | apps.employees | employees |
| (incluído em `api/v1/`) | apps.materials | materials |
| (incluído em `api/v1/`) | apps.financial | financial |
| (incluído em `api/v1/`) | apps.scans | scans (upload, send-to-printer) |
| `api/v1/access/` | access_control | Controle de acesso |
| `api/v1/dashboard/` | dashboard | Dashboard |
| `api/v1/scheduling/` | intelligent_scheduling | Agendamento |
| `api/v1/analytics/` | predictive_analytics | Analytics |
| `api/v1/support/` | automated_support | Suporte |
| `api/v1/smart-orders/` | smart_orders | Smart orders |

Endpoints globais adicionais (fora do `api/v1/`):

- `POST /api/token/` – Obtenção de token JWT.
- `POST /api/token/refresh/` – Refresh do token JWT.

**LGPD:** `GET /api/v1/auth/export-my-data/` (autenticado) – exportação dos dados do usuário (Art. 18).

---

## 3. Homologação (staging)

### 3.1 Arquivos e ferramentas

- **Compose de staging:** `docker-compose.staging.yml` (na raiz do repositório).
- **Makefile:** na raiz; alvos `build-staging`, `start-staging`, `stop-staging`, `deploy-staging`, `migrate-staging`, `logs-staging`, `status-staging`, etc.
- **Backend para staging:** build a partir de `labmanager_source/`, usando `Dockerfile.staging`; settings: `labmanager.settings_staging`.
- **Script de entrada do container web:** `labmanager_source/scripts/staging-entrypoint.sh` (migrações, collectstatic, criação de usuário admin e dados de teste).

### 3.2 Serviços e portas (staging)

| Serviço | Container | Porta no host | Observação |
|---------|-----------|----------------|------------|
| Nginx | proteticflow_staging_nginx | 8080 (HTTP), 8443 (HTTPS) | Proxy para frontend e API |
| Django (Gunicorn) | proteticflow_staging_web | 8001 → 8000 | API e admin |
| PostgreSQL | proteticflow_staging_db | 5433 → 5432 | BD staging |
| Redis | proteticflow_staging_redis | 6380 → 6379 | Cache/Celery |
| Celery worker | proteticflow_staging_celery | - | Tarefas assíncronas |
| Celery beat | proteticflow_staging_celery_beat | - | Agendamento de tarefas |
| Selenium | proteticflow_selenium | 4444, 7900 (VNC) | Testes E2E |
| MailHog | proteticflow_mailhog | 1025 (SMTP), 8025 (Web) | E-mails de teste |
| Prometheus | proteticflow_staging_prometheus | 9091 → 9090 | Métricas |
| Grafana | proteticflow_staging_grafana | 3001 → 3000 | Dashboards |

### 3.3 URLs de acesso (staging local)

- **Aplicação (via Nginx):** `http://localhost:8080` (ou conforme `nginx`/proxy).
- **API:** `http://localhost:8080/api/v1/` (ou `http://localhost:8001/api/v1/` se acessar direto ao container web).
- **Health check:** `GET http://localhost:8080/api/v1/health/` ou `http://localhost:8001/api/v1/health/`.
- **Admin Django:** `http://localhost:8080/admin/` (ou porta 8001 se direto ao web).
- **MailHog (e-mails):** `http://localhost:8025`.
- **Grafana:** `http://localhost:3001`.

### 3.4 Variáveis de ambiente (staging)

Definir na raiz do projeto (ou onde o `docker-compose.staging.yml` for executado), por exemplo em `.env`:

- **Django:** `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`, `ENVIRONMENT=staging`.
- **Banco:** `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST=db`, `DB_PORT=5432` (dentro do compose).
- **Redis:** `REDIS_PASSWORD`; no compose usa-se `REDIS_URL=redis://:...@redis:6379/0`.
- **CORS:** `CORS_ALLOWED_ORIGINS`.
- **Opcional:** `POPULATE_TEST_DATA=True` para o entrypoint popular dados de teste.

Valores padrão no compose: `DB_NAME=proteticflow_staging`, `DB_USER=postgres_staging`, portas 5433 (host) e 6380 (host) para não conflitar com produção.

### 3.5 Comandos úteis (homologação)

Na raiz do repositório:

```bash
# Build e subida
make build-staging
make start-staging

# Deploy completo (clean + build + start + migrate + seed)
make deploy-staging

# Migrações (com containers já no ar)
make migrate-staging

# Criar/atualizar superusuário admin (senha staging123)
make seed-staging

# Logs e status
make logs-staging
make status-staging

# Parar e limpar
make stop-staging
make clean-staging
```

**Nota sobre usuário admin em staging:** o `CustomUser` possui campo `role`. Para o admin ter permissões completas, ele deve ter `role='superadmin'`. No `staging-entrypoint.sh`, após o bloco que cria o superusuário, adicione no mesmo `shell -c` (ou em um segundo comando):

```python
User.objects.filter(username='admin').update(role='superadmin')
```

O `make seed-staging` atual apenas define senha e `is_staff`/`is_superuser`; se usar CustomUser, execute no container após o seed: `python manage.py shell -c "from django.contrib.auth import get_user_model; get_user_model().objects.filter(username='admin').update(role='superadmin')"`.

### 3.6 Verificação pós-deploy (staging)

1. Health: `curl -s http://localhost:8080/api/v1/health/` (ou porta 8001).
2. Admin: acessar `http://localhost:8080/admin/` e fazer login (ex.: admin / staging123, se configurado).
3. Frontend: se o build estiver em `frontend/labmanager-frontend/dist` e o Nginx apontar para ele, abrir `http://localhost:8080` e testar login e um fluxo principal.

---

## 4. Testes (estado atual)

### 4.1 Onde rodar

- **Backend:** sempre a partir de **`labmanager_source/`** (onde está o `manage.py` e as apps).

### 4.2 Testes Django (manage.py)

```bash
cd labmanager_source
python manage.py test apps.scans.tests apps.financial.tests_tasks --verbosity=2
```

Ou com venv:

```bash
cd labmanager_source
.\venv\Scripts\python.exe manage.py test apps.scans.tests apps.financial.tests_tasks --verbosity=2
```

### 4.3 Testes com pytest

Definir `DJANGO_SETTINGS_MODULE=labmanager.settings` (ou o settings adequado). Exemplo:

```bash
cd labmanager_source
set DJANGO_SETTINGS_MODULE=labmanager.settings
.\venv\Scripts\python.exe -m pytest apps/scans/tests.py apps/financial/tests_tasks.py -v --tb=short
```

### 4.4 Check de deploy (Django)

```bash
cd labmanager_source
python manage.py check --deploy
```

Deve terminar com exit 0; avisos de segurança (HSTS, SSL, DEBUG, etc.) são esperados em desenvolvimento e devem ser tratados em produção.

### 4.5 Suítes de teste documentadas

- **apps.scans.tests:** parser XML iTero, upload de scan, rejeição de duplicata (order_id).
- **apps.financial.tests_tasks:** tarefas Celery (fechamento mensal, lembretes de vencimento), endpoint de comissão (rota e validação).

Os testes que criam `CustomUser` (por exemplo com `role='gerente'`) desregistram temporariamente o auditlog para o modelo de usuário, para evitar erro de coluna em tabelas relacionadas (ex.: employees) no banco de testes.

---

## 5. Produção (resumo)

- **Compose:** `docker-compose.yml` (produção).
- **Comandos Make:** `make deploy-prod`, `make backup`, `make restore`, etc.
- **Configuração:** usar `DEBUG=False`, `SECRET_KEY` e senhas fortes, `ALLOWED_HOSTS` e CORS restritos ao domínio real, SSL (ex.: Let’s Encrypt) e headers de segurança (HSTS, etc.). Detalhes devem seguir o `GUIA_PRODUCAO.md` e o checklist de segurança do Django (`check --deploy`).

---

## 6. Checklist de homologação (antes de considerar “homologado”)

- [ ] `make build-staging` e `make start-staging` (ou `make deploy-staging`) concluem sem erro.
- [ ] `GET /api/v1/health/` retorna status saudável.
- [ ] Login no admin com usuário de staging (ex.: admin) e verificação de que roles/permissões estão corretos.
- [ ] Login no frontend (se disponível) e um fluxo crítico (ex.: listar clientes, abrir um trabalho).
- [ ] `python manage.py check --deploy` sem falhas (no ambiente de staging/produção).
- [ ] Testes automatizados: `manage.py test apps.scans.tests apps.financial.tests_tasks` (e demais suítes relevantes) passando.
- [ ] Migrações aplicadas (`make migrate-staging` ou via entrypoint) sem erro.
- [ ] Variáveis de ambiente documentadas e `.env` de exemplo disponível (sem segredos reais).
- [ ] Documentação de API (ou referência) atualizada com base em `/api/v1/` e endpoints de auth/token acima.

---

## 7. Referência rápida de arquivos

| Finalidade | Caminho |
|-----------|---------|
| Backend (raiz) | `labmanager_source/` |
| Frontend (raiz) | `frontend/labmanager-frontend/` |
| Settings desenvolvimento | `labmanager_source/labmanager/settings.py` |
| Settings staging | `labmanager_source/labmanager/settings_staging.py` |
| URLs principais | `labmanager_source/labmanager/urls.py` |
| Compose staging | `docker-compose.staging.yml` |
| Compose produção | `docker-compose.yml` |
| Dockerfile staging | `labmanager_source/Dockerfile.staging` |
| Entrypoint staging | `labmanager_source/scripts/staging-entrypoint.sh` |
| Makefile | `Makefile` |

---

*Este documento consolida o estado atual do projeto e o processo de homologação. Para detalhes de negócio (planos, métricas, comandos Flow IA), manter alinhamento com o README.md e a documentação de produto.*
