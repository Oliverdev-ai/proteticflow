# Diagnóstico Comparativo — ProteticFlow
**GitHub (`branch dev`)** vs **Projeto Local (`proteticflow-ui`)**
**Data:** 15/03/2026 | **Autor:** GEN-ENGINEER Senior

---

## Contexto Crítico: São Dois Projetos Diferentes

> **Atenção:** O repositório GitHub é um projeto **Django + React (JSX)** com backend Python. O projeto local é **Node.js + React (TSX)** com tRPC. Não é uma migração direta — é uma **reescrita arquitetural completa** com stack diferente.

| Dimensão | GitHub (`dev`) | Local (`proteticflow-ui`) |
|---|---|---|
| **Backend** | Django 4.x + DRF | Node.js + Express + tRPC |
| **Frontend** | React 18 + JSX + React Router | React 19 + TSX + Wouter |
| **Banco** | PostgreSQL (Django ORM) | MySQL/TiDB (Drizzle ORM) |
| **Auth** | JWT próprio + CustomUser | Manus OAuth + JWT cookie |
| **IA** | OpenAI via Python | Manus LLM (invokeLLM) |
| **Testes** | pytest + unittest | Vitest |
| **Deploy** | Docker + Nginx + Celery | Manus Platform (serverless) |
| **Multi-tenant** | Não implementado | Em implementação (Fase 17) |
| **TypeScript** | Não (JSX) | Sim (strict mode) |

---

## 1. O QUE EXISTE NO GITHUB QUE NÃO ESTÁ NO LOCAL

### 1.1 Módulos de Backend (Django Apps) Ausentes no Local

| App/Módulo | Entidades/Models | Funcionalidade | Prioridade |
|---|---|---|---|
| `apps/employees` | `EmployeeProfile`, `EmployeeSkill`, `JobAssignment`, `CommissionPayment`, `CommissionPaymentItem` | Gestão de colaboradores/técnicos, habilidades, comissões, atribuição de jobs | **Alta** |
| `apps/licensing` | `LicensePlan`, `License`, `LicenseCheck` | Controle de planos, limites de uso, verificação de licença | **Alta** (SaaS) |
| `payroll` | `PayrollPeriod`, `PayrollEntry`, `FinancialReport` | Folha de pagamento, fechamento mensal de RH, relatórios de RH | Média |
| `intelligent_scheduling` | `TechnicianProfile`, `JobTimeEstimate`, `ProductionSchedule`, `BottleneckAlert`, `MLModelMetrics` | Agendamento inteligente com ML (RandomForest), estimativa de tempo, alertas de gargalo | Média |
| `smart_orders` | `ClientOrderHistory`, `SmartOrderTemplate`, `MaterialSuggestion`, `PriceEstimationModel`, `SmartOrderSuggestion`, `ReworkPattern`, `SmartOrderMetrics` | Sugestão automática de OS, previsão de preço, padrões de retrabalho, auto-fill | Média |
| `automated_support` | `ChatbotConversation`, `ChatbotMessage`, `AutomatedNotification`, `AutoResponseTemplate`, `SmartScheduling`, `SupportTicket` | Suporte automatizado, chatbot, tickets de suporte, notificações automáticas | Baixa |
| `access_control` | `SubscriptionPlan`, `UserRole`, `UserSubscription`, `UserProfile`, `UsageTracking`, `AccessRestriction`, `RolePermissionsMatrix` | Controle de acesso granular por plano, matriz de permissões por role | **Alta** (SaaS) |
| `predictive_analytics` | `RevenuePredictor`, `TrendAnalysis`, `PerformanceMetric`, `SeasonalityPattern`, `PredictiveAlert`, `DashboardWidget` | Analytics preditivo avançado, widgets de dashboard, alertas preditivos | Média |
| `apps/materials` (extra) | `PurchaseOrder`, `PurchaseOrderItem` | Ordens de compra de materiais, gestão de pedidos a fornecedores | **Alta** |

### 1.2 Páginas Frontend Ausentes no Local

| Página (GitHub) | Funcionalidade | Equivalente Local |
|---|---|---|
| `DeliverySchedulePage.jsx` | Agenda de entregas com calendário, filtros por status, impressão | **Ausente** — sem rota `/delivery-schedule` |
| `PayersReportPage.jsx` | Relatório de pagadores, análise de inadimplência | **Ausente** |
| `PlansPage.jsx` | Página de planos/licenciamento com upgrade | **Ausente** |
| `FinancialReportsPage.jsx` | Relatórios financeiros avançados com tabs | Parcialmente em `/relatorios` |
| `SuppliersPage.jsx` | Gestão de fornecedores com CRUD completo | Parcialmente em `/estoque` |
| `JobFormPage.jsx` | Formulário dedicado de criação/edição de OS com foto upload | Parcialmente em `/trabalhos` |
| `ClientFormPage.jsx` | Formulário dedicado de criação/edição de cliente | Parcialmente em `/clientes` |

### 1.3 Componentes Frontend Ausentes no Local

| Componente (GitHub) | Funcionalidade |
|---|---|
| `components/jobs/JobPhotoUpload.jsx` | Upload de fotos vinculadas a OS (usa S3) |
| `components/settings/EmployeesTab.jsx` | Aba de gestão de funcionários nas configurações |
| `components/settings/AuthorizationsTab.jsx` | Aba de permissões/autorizações por usuário |
| `components/settings/MyProfileTab.jsx` | Aba de perfil do usuário logado |
| `LicenseIndicator.jsx` | Indicador visual de status da licença no header |
| `LimitReachedModal.jsx` | Modal de limite de uso atingido (freemium gate) |
| `withLicenseCheck.jsx` | HOC para bloquear features por plano |

### 1.4 Serviços/Hooks Ausentes no Local

| Arquivo (GitHub) | Funcionalidade |
|---|---|
| `services/licenseService.js` | Verificação e cache de licença ativa |
| `services/deliveryService.js` | Serviço de agenda de entregas |
| `services/pricingService.js` | Cálculo de preços dinâmicos |
| `hooks/usePermissions.js` | Hook de verificação de permissões por módulo |
| `hooks/useLicense.js` | Hook de estado da licença (plano, limites, expiração) |

### 1.5 Infraestrutura Ausente no Local

| Item (GitHub) | Descrição |
|---|---|
| `Dockerfile` + `docker-compose.yml` | Containerização completa (Django + Celery + Redis + Nginx) |
| `nginx/` | Configuração de proxy reverso e SSL |
| `monitoring/prometheus.yml` | Monitoramento com Prometheus |
| `scripts/backup.sh` | Script de backup automatizado do banco |
| `scripts/deploy.sh` | Script de deploy para produção |
| Celery tasks | Processamento assíncrono (ML training, notificações) |
| `tests/e2e/` | Testes E2E com Playwright/Cypress |
| `tests/performance/` | Testes de carga e Lighthouse |
| `tests/security/` | Testes de segurança automatizados |

---

## 2. O QUE EXISTE NO LOCAL QUE NÃO ESTÁ NO GITHUB

### 2.1 Backend (tRPC/Node.js) — Exclusivos do Local

| Módulo/Router | Funcionalidade | Status |
|---|---|---|
| `server/routers/kanban.ts` | Kanban board com máquina de estados, transições válidas, métricas de produção, histórico de movimentações | **Completo** |
| `server/routers/pdfReports.ts` | Geração de PDFs (OS, relatórios financeiros, estoque) via Puppeteer | **Completo** (897 linhas) |
| `server/routers/portal.ts` | Portal do cliente com token JWT, visualização de OS em tempo real | **Completo** |
| `server/routers/pushNotifications.ts` | Push notifications PWA (Web Push API, VAPID) | **Completo** |
| `server/db.predictions.ts` | Engine de predição de receita (séries temporais, sazonalidade, pipeline) | **Completo** (415 linhas) |
| `server/db.tenant.ts` | Helpers multi-tenant (create, switch, list, members, roles) | **Em progresso** (Fase 17) |
| `server/db.reports.ts` | Relatórios de produção, financeiro e estoque com filtros avançados | **Completo** |
| `server/db.jobLogs.ts` | Log de eventos de OS (criação, mudança de status/etapa) | **Completo** |
| `server/db.portal.ts` | Geração e validação de tokens do portal do cliente | **Completo** |
| `server/db.push.ts` | Gestão de subscriptions push por usuário | **Completo** |
| `server/db.labSettings.ts` | Configurações do laboratório (logo, dados fiscais, etc.) | **Completo** |
| `server/db.stock.ts` | Gestão completa de estoque (categorias, materiais, movimentações, relatórios) | **Completo** |

### 2.2 Schema/Tabelas — Exclusivos do Local

| Tabela | Descrição |
|---|---|
| `tenants` | Laboratórios (multi-tenant SaaS) |
| `tenant_members` | Membros por tenant com roles |
| `order_blocks` | Blocos de OS por cliente (agrupamento) |
| `client_portal_tokens` | Tokens JWT para portal do cliente |
| `push_subscriptions` | Subscriptions Web Push por usuário |
| `deadline_notif_log` | Log de notificações de prazo (dedup) |
| `financial_closings` | Fechamentos mensais financeiros |
| `job_logs` | Histórico de eventos de OS |

### 2.3 Frontend — Exclusivos do Local

| Página/Componente | Funcionalidade |
|---|---|
| `pages/Kanban.tsx` | Board Kanban visual com drag-and-drop, filtros, métricas (910 linhas) |
| `pages/Portal.tsx` | Portal do cliente (acesso via token, sem login) (589 linhas) |
| `pages/RelatoriosPDF.tsx` | Geração e download de PDFs |
| `pages/FlowIA.tsx` | Chat com IA contextual (dados do lab em tempo real) |
| `pages/GestaoUsuarios.tsx` | Gestão de usuários com convites, roles, ativação/desativação |
| `pages/TabelaPrecos.tsx` | Tabela de preços com CRUD |
| `components/DashboardLayout.tsx` | Layout com sidebar responsiva, notificações, perfil |
| `components/PushNotificationButton.tsx` | Botão de ativação de push notifications |
| `hooks/usePushNotifications.ts` | Hook de gestão de push notifications |

### 2.4 Arquitetura — Exclusivos do Local

| Feature | Descrição |
|---|---|
| **Multi-tenant** | Schema com `tenants` + `tenant_members`, `tenantId` em todas as tabelas, `resolveActiveTenantId` no contexto |
| **tRPC type-safe** | Contratos end-to-end TypeScript strict, sem REST manual |
| **Manus OAuth** | SSO integrado com plataforma Manus |
| **Manus LLM** | IA via `invokeLLM` sem gerenciar chaves de API |
| **Vitest 303 testes** | Suite de testes unitários completa (303 testes passando) |
| **PWA Push** | Web Push API com VAPID para notificações nativas |
| **PDF Generation** | Geração server-side de PDFs profissionais |

---

## 3. ANÁLISE DE GAPS — O QUE PRECISA SER MIGRADO

### Prioridade Crítica (SaaS-gate)

| Gap | Impacto | Estimativa |
|---|---|---|
| **Sistema de Licenciamento/Planos** | Sem isso não tem modelo de negócio SaaS | 3-4 fases |
| **Gestão de Funcionários/Técnicos** | Feature core para labs com equipe | 2-3 fases |
| **Ordens de Compra (PurchaseOrder)** | Gestão de estoque incompleta sem isso | 1-2 fases |
| **Permissões granulares por módulo** | `usePermissions` + `withLicenseCheck` | 1-2 fases |

### Prioridade Alta (diferencial competitivo)

| Gap | Impacto | Estimativa |
|---|---|---|
| **Agenda de Entregas** | Feature muito solicitada por labs | 1-2 fases |
| **Folha de Pagamento (Payroll)** | Diferencial vs concorrentes | 2-3 fases |
| **Smart Orders (sugestão automática)** | IA aplicada ao negócio | 2-3 fases |
| **Agendamento Inteligente (ML)** | Diferencial premium | 3-4 fases |

### Prioridade Média (completude)

| Gap | Impacto | Estimativa |
|---|---|---|
| **Formulários dedicados de OS e Cliente** | UX melhorada para criação/edição | 1 fase |
| **Relatório de Pagadores** | Gestão de inadimplência | 1 fase |
| **Upload de fotos em OS** | Documentação visual de trabalhos | 1 fase |
| **Analytics preditivo avançado** | Dashboard com widgets dinâmicos | 2-3 fases |

---

## 4. PLANO DE AÇÃO RECOMENDADO

### Sequência Lógica de Implementação

```
FASE 17 (atual) → Multi-tenant base (em andamento)
FASE 18 → Sistema de Licenciamento + Planos + withLicenseCheck
FASE 19 → Gestão de Funcionários/Técnicos + Comissões
FASE 20 → Ordens de Compra (PurchaseOrder) + Agenda de Entregas
FASE 21 → Permissões granulares por módulo (access_control)
FASE 22 → Folha de Pagamento (Payroll)
FASE 23 → Smart Orders (sugestão automática de OS)
FASE 24 → Agendamento Inteligente (ML scheduling)
FASE 25 → Analytics preditivo avançado + Dashboard widgets
```

### Decisão Arquitetural Importante

> **O código Python do GitHub NÃO deve ser portado diretamente.** A lógica de negócio (regras, cálculos, ML) deve ser **reimplementada em TypeScript** seguindo os padrões do projeto local (tRPC + Drizzle + Vitest). O GitHub serve como **especificação funcional**, não como código reutilizável.

### Exceções — Lógica Reutilizável do GitHub

| Componente | O que aproveitar |
|---|---|
| `smart_orders/ml_engine.py` | Algoritmos de sugestão → reimplementar com `invokeLLM` |
| `intelligent_scheduling/ml_models.py` | Lógica de estimativa de tempo → usar LLM + dados históricos |
| `access_control/models.py` | Estrutura de planos e permissões → mapear para schema Drizzle |
| `payroll/views.py` | Regras de cálculo de comissão → reimplementar em TypeScript |

---

## 5. ESTADO ATUAL DO PROJETO LOCAL (Fase 17)

| Item | Status |
|---|---|
| Schema multi-tenant (tenants + tenant_members) | Completo no banco |
| `db.tenant.ts` helpers | Criado (com erros TS a corrigir) |
| `tenantId` em todos os helpers db.* | **Pendente** (40 erros TS) |
| Tenant router (tRPC) | **Pendente** |
| Página /onboarding | **Pendente** |
| Seletor de tenant no header | **Pendente** |
| Testes do tenant router | **Pendente** |
| Checkpoint salvo | **Pendente** |

---

*Diagnóstico gerado em 15/03/2026 — GEN-ENGINEER Senior ProteticFlow*
