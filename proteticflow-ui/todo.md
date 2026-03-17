# ProteticFlow UI - TODO

## Fase 1: Upgrade e Backend
- [x] Upgrade para web-db-user
- [x] Resolver conflitos de merge (Home.tsx, DashboardLayout.tsx)
- [x] Criar schema do banco de dados (clientes, trabalhos, preços, notificações, chat)
- [x] Executar migrations (pnpm db:push)
- [x] Criar query helpers em server/db.ts
- [x] Criar tRPC routers para Clientes, Trabalhos, Preços, Dashboard, Notificações, Chat

## Fase 2: Integração Frontend-Backend
- [x] Substituir dados mock de Clientes por chamadas tRPC
- [x] Substituir dados mock de Trabalhos por chamadas tRPC
- [x] Substituir dados mock de Tabela de Preços por chamadas tRPC
- [x] Substituir dados mock de Dashboard por chamadas tRPC
- [x] Integrar Flow IA com LLM backend real (invokeLLM + contexto do laboratório)

## Fase 3: Modais de Detalhes
- [x] Modal de detalhes/edição de Cliente
- [x] Modal de detalhes/edição de Trabalho
- [x] Modal de novo Cliente
- [x] Modal de novo Trabalho
- [x] Modal de novo/edição Preço

## Fase 4: Notificações em Tempo Real
- [x] Sistema de notificações no backend (CRUD completo)
- [x] Componente de notificações na topbar (Popover com bell + badge)
- [x] Marcar como lida / Marcar todas como lidas
- [x] Polling a cada 30 segundos para novas notificações

## Fase 5: Testes e Entrega
- [x] Testes vitest para routers backend (38 testes passando)
- [x] Testes de segurança (endpoints protegidos rejeitam unauthenticated)
- [x] Testes de validação de input (email, state, progress, estimatedDays)
- [x] Testes de Flow IA (LLM mock, fallback de erro)
- [x] Checkpoint e entrega final

## Fase 6: RBAC — Controle de Acesso por Perfil
- [x] Backend: Criar adminProcedure que rejeita colaboradores
- [x] Backend: Proteger rotas sensíveis (dashboard stats financeiros, configurações, preços-edição)
- [x] Backend: Colaborador pode listar/criar/atualizar trabalhos e clientes, mas não deletar
- [x] Backend: Colaborador não acessa relatórios financeiros nem configurações
- [x] Frontend: Sidebar condicional — ocultar itens restritos para colaborador
- [x] Frontend: Rotas protegidas — redirecionar colaborador se tentar acessar rota admin
- [x] Frontend: Dashboard do colaborador sem dados financeiros (faturamento, receita)
- [x] Frontend: Ocultar botões de delete para colaborador
- [x] Testes vitest para RBAC (admin vs colaborador) — 22 testes RBAC + 61 total
- [x] Checkpoint e entrega

## Fase 7: Gestão de Usuários (Admin)
- [x] Backend: Tabela de convites (invites) no schema
- [x] Backend: Router adminUsers com list, invite, updateRole, deactivate, reactivate
- [x] Backend: Lógica de convite com token único e expiração
- [x] Frontend: Página GestaoUsuarios com tabela de usuários e status
- [x] Frontend: Modal de convite de colaborador (email + role)
- [x] Frontend: Modal de edição de role (user ↔ admin)
- [x] Frontend: Botão de desativar/reativar conta
- [x] Frontend: Adicionar rota /usuarios na sidebar (admin-only)
- [x] Testes vitest para gestão de usuários — 18 testes

## Fase 8: Notificações Automáticas de Prazo (24h)
- [x] Backend: Job agendado que verifica trabalhos com deadline nas próximas 24h
- [x] Backend: Criar notificações automáticas para todos os usuários ativos
- [x] Backend: Endpoint para disparar verificação manual (admin)
- [x] Backend: Evitar notificações duplicadas (verificar se já foi notificado)
- [x] Frontend: Notificações automáticas aparecem no sino com ícone de prazo
- [x] Testes vitest para notificações automáticas — 5 testes
- [x] Checkpoint e entrega — 84 testes total

## Fase 9: Blocos de OS + Numeração Automática

- [x] Schema: tabela `orderBlocks` (clientId, blockStart, blockEnd, description)
- [x] Schema: campo `orderNumber` (int, indexado) na tabela `jobs`
- [x] Backend: router `orderBlocks` (CRUD + resolveClientByOrderNumber)
- [x] Backend: lógica de auto-resolução de cliente por número de OS
- [x] Backend: ao criar job com orderNumber, validar que pertence ao cliente
- [x] Frontend: seção "Blocos de OS" na página de Clientes (modal de cadastro de bloco)
- [x] Frontend: campo "Nº da OS" visível na criação/edição de trabalhos
- [x] Flow IA: comando "cadastre OS nº 125, paciente João, trabalho SNS 03" — IA orienta o usuário
- [x] Flow IA: comando "dê baixa na OS nº 125" — IA orienta o usuário
- [x] Flow IA: comando "quem é o dono da OS nº 1250?" — IA resolve via blocos

## Fase 10: Módulo Financeiro Completo

- [x] Schema: tabela `accountsReceivable` (jobId, clientId, amount, dueDate, paidAt, status)
- [x] Schema: tabela `financialClosings` (clientId, period, totalAmount, status, closedAt)
- [x] Schema: tabela `accountsPayable` (description, supplier, amount, dueDate, paidAt)
- [x] Backend: router `financial` (contas a receber, fechamento mensal, extrato por cliente)
- [x] Backend: lançamento automático de conta a receber ao marcar job como "Entregue"
- [x] Backend: fechamento mensal — somar débitos de cada cliente no período
- [x] Backend: extrato por cliente com filtro de data
- [x] Frontend: página "Financeiro" com tabs (Contas a Receber, Fechamento, Extrato, Contas a Pagar)
- [x] Frontend: modal de fechamento mensal por cliente
- [x] Frontend: extrato por cliente com filtro de período
- [x] Frontend: sidebar admin: adicionar item "Financeiro"
- [x] Flow IA: contexto financeiro expandido (receivables, closings, payables, statement)
- [x] Flow IA: resolução automática de OS por número no chat
- [x] Flow IA: resumo financeiro por cliente no contexto admin
- [x] Testes vitest para Fases 9 e 10 — 115 testes total
- [x] Checkpoint e entrega

## Fase 11: Kanban de Produção (Drag-and-Drop)

- [x] Backend: procedimento tRPC `kanban.getBoard` — listar trabalhos agrupados por status
- [x] Backend: procedimento tRPC `kanban.moveJob` — atualizar status do trabalho (com log)
- [x] Backend: validação de transição de status (5 colunas: Aguardando → Em Produção → Revisão → Pronto → Entregue)
- [x] Backend: registrar notificação de movimentação (via createNotification)
- [x] Frontend: instalar @dnd-kit para drag-and-drop acessível
- [x] Frontend: página Kanban.tsx com 5 colunas (Aguardando, Em Produção, Revisão, Pronto, Entregue)
- [x] Frontend: cards de trabalho com info resumida (OS, cliente, paciente, prazo, preço)
- [x] Frontend: drag-and-drop entre colunas com feedback visual (DragOverlay, drop zones)
- [x] Frontend: indicadores visuais de prazo (atrasado = vermelho, hoje = âmbar, futuro = verde)
- [x] Frontend: filtros por cliente e busca por código/OS/serviço
- [x] Frontend: adicionar rota /kanban na sidebar (ícone Columns3)
- [x] Frontend: responsividade — scroll horizontal em mobile (snap-x)
- [x] Flow IA: contexto Kanban expandido + orientação de movimentação
- [x] Testes vitest para Kanban — 17 testes (getBoard, moveJob, getValidTransitions, RBAC)
- [x] Checkpoint e entrega — 132 testes total

## Fase 12: Módulo de Estoque (P1)

- [x] Schema: tabela `materialCategories` (id, name, description, color, createdAt)
- [x] Schema: tabela `suppliers` (id, name, contact, email, phone, address, notes, isActive, createdAt, updatedAt)
- [x] Schema: tabela `materials` (id, categoryId, supplierId, name, unit, currentStock, minStock, maxStock, costPrice, notes, isActive, createdAt, updatedAt)
- [x] Schema: tabela `stockMovements` (id, materialId, type: in/out/adjustment, quantity, reason, jobId?, invoiceNumber?, unitCost?, notes, createdBy, createdAt)
- [x] Backend: executar pnpm db:push para migrar schema
- [x] Backend: helpers de banco `db.stock.ts` (CRUD + getStockSummary + getLowStock + consumptionReport)
- [x] Backend: router `stock` com sub-routers (categories, suppliers, materials, movements)
- [x] Backend: alerta automático ao salvar movimento que leva estoque abaixo do mínimo (notifica todos os usuários)
- [x] Frontend: página Estoque.tsx com tabs (Materiais, Fornecedores, Movimentações)
- [x] Frontend: lista de materiais com estoque atual vs. mínimo e badge de alerta
- [x] Frontend: modal de novo/editar material (categoria, fornecedor, unidade, estoques)
- [x] Frontend: modal de entrada/saída de material com seleção de tipo e quantidade
- [x] Frontend: histórico de movimentações com filtros por material e período
- [x] Frontend: painel de alertas de reposição (materiais abaixo do mínimo)
- [x] Frontend: adicionar rota /estoque na sidebar (Package icon)
- [x] Flow IA: contexto de estoque (materiais críticos, valor total, alertas de reposição)
- [x] Flow IA: responder "qual o status do estoque de X?" e "relatório de consumo do mês"
- [x] Testes vitest: 29 testes (categories, suppliers, materials, movements, RBAC, alertas) — 161 total
- [x] Checkpoint e entrega

## Melhorias Kanban (Pós-Fase 11)

- [ ] Schema: tabela `jobLogs` (id, jobId, userId, fromStatus, toStatus, notes, createdAt)
- [ ] Schema: campo `assignedTo` (userId FK) na tabela `jobs`
- [ ] Backend: helpers `db.jobLogs.ts` (createLog, listLogsByJob, getKanbanMetrics)
- [ ] Backend: kanban.moveJob registra log em `jobLogs` automaticamente
- [ ] Backend: kanban.getBoard retorna `assignedTo` com nome do responsável
- [ ] Backend: kanban.assignJob — atribuir responsável a um trabalho
- [ ] Backend: kanban.getMetrics — tempo médio por coluna, throughput, gargalos
- [ ] Frontend: card Kanban exibe avatar do responsável + tooltip com nome
- [ ] Frontend: modal de detalhes do card com timeline de movimentações
- [ ] Frontend: dropdown de atribuição de responsável no card
- [ ] Frontend: widget de métricas de produção (tempo médio por etapa, throughput)
- [ ] Testes vitest para jobLogs e métricas

## Fase 13: Relatórios e Exportação PDF

- [ ] Backend: router `reports` com produção, financeiro, estoque, desempenho
- [ ] Backend: relatório de produção (trabalhos por período, por cliente, por serviço)
- [ ] Backend: relatório financeiro (receita, a receber, fechamentos, contas a pagar)
- [ ] Backend: relatório de estoque (consumo mensal, materiais críticos, valor em estoque)
- [ ] Frontend: página Relatórios.tsx com seleção de tipo e período
- [ ] Frontend: visualização prévia do relatório antes de exportar
- [ ] Frontend: exportação PDF via jsPDF (client-side, sem dependência de servidor)
- [ ] Frontend: exportação CSV para relatórios tabulares
- [ ] Frontend: adicionar rota /relatorios na sidebar (admin-only)
- [ ] Flow IA: relatórios preditivos (previsão de receita, gargalos, demanda)
- [ ] Testes vitest para router de relatórios
- [ ] Checkpoint e entrega

## Relatório Preditivo Flow IA

- [ ] Backend: `db.predictions.ts` — média móvel ponderada (6 meses), pipeline atual, sazonalidade
- [ ] Backend: `getPrediction()` — retorna estimativa, intervalo de confiança, fatores e recomendações
- [ ] Backend: router `reports.predict` — procedure tRPC protegida (admin)
- [ ] Flow IA: contexto preditivo no systemPrompt (estimativa, pipeline, tendência, confiança)
- [ ] Flow IA: responder "qual a previsão de receita do próximo mês?" com dados estruturados
- [ ] Frontend: widget "Previsão" na página Relatórios com gauge de confiança
- [ ] Frontend: card de fatores positivos/negativos que influenciam a previsão
- [ ] Testes vitest: cálculo de média móvel, pipeline, sazonalidade, edge cases
- [ ] Checkpoint e entrega

## Fase 14: Relatórios em PDF (P1)

- [ ] Schema: tabela `labSettings` (id, labName, cnpj, phone, email, address, logoUrl, reportHeader, reportFooter, updatedAt)
- [ ] Backend: helpers `db.labSettings.ts` (getLabSettings, upsertLabSettings)
- [ ] Backend: upload de logo para S3 (storagePut) com retorno de URL CDN
- [ ] Backend: engine PDF server-side `server/pdf.engine.ts` (jsPDF + autoTable, header com logo, footer com rodapé)
- [ ] Backend: procedure `reports.generatePdf` — tipo: monthly_closing | jobs_period | productivity | quarterly_annual | stock
- [ ] Backend: relatório de fechamento mensal por cliente (OS, valores, totais por cliente)
- [ ] Backend: relatório de trabalhos por período (filtro cliente, status, tipo)
- [ ] Backend: relatório de produtividade por técnico (jobs entregues, tempo médio, receita gerada)
- [ ] Backend: relatório trimestral/anual do laboratório (KPIs, evolução mensal, top clientes)
- [ ] Backend: relatório de estoque (materiais, saldo atual, movimentações do período)
- [ ] Frontend: página Configurações do Lab (logo upload, nome, CNPJ, endereço, header/footer)
- [ ] Frontend: seção PDF na página Relatórios (botão "Gerar PDF" por tipo com seletor de período)
- [ ] Frontend: preview inline do PDF antes do download
- [ ] Frontend: adicionar item Configurações do Lab na sidebar (Settings icon)
- [ ] Flow IA: comando "gere o relatório mensal/trimestral/anual do laboratório" → retorna link de download
- [ ] Testes vitest para o módulo de relatórios PDF (engine, procedures, labSettings)
- [ ] Checkpoint Fase 14

## Envio de Relatório por E-mail
- [ ] Backend: procedure `pdfReports.sendMonthlyClosingEmail` — gera PDF + envia por e-mail
- [ ] Backend: integração com Nodemailer (SMTP via Resend) para envio com anexo PDF base64
- [ ] Backend: template de e-mail HTML com dados do laboratório e cliente
- [ ] Frontend: botão "Enviar por E-mail" na página Relatórios PDF
- [ ] Frontend: modal de confirmação com campo de e-mail do destinatário e mensagem personalizada
- [ ] Frontend: feedback de sucesso/erro após envio
- [ ] Testes vitest para sendMonthlyClosingEmail (RBAC + validação de input)
- [ ] Checkpoint e entrega

## Fase 15: Portal do Cliente

- [ ] Schema: tabela `clientPortalTokens` (id, clientId, token, expiresAt, isActive, createdAt, lastAccessAt)
- [ ] Migration pnpm db:push executada
- [ ] Backend: helper `db.portal.ts` (generateToken, validateToken, getPortalData, trackAccess)
- [ ] Backend: router `portal` com procedures públicas (sem auth): getPortalData, trackAccess
- [ ] Backend: procedure admin: generatePortalToken, revokePortalToken, sendPortalLink, listTokens
- [ ] Frontend: página pública `/portal/:token` com timeline de OS, status Kanban e dados do cliente
- [ ] Frontend: design profissional para o cliente (logo do lab, cores, responsivo)
- [ ] Frontend: indicadores de status com cores (Aguardando, Em Produção, Revisão, Pronto, Entregue)
- [ ] Frontend: timeline de movimentações por OS (histórico de jobLogs)
- [ ] Frontend: painel admin de gestão de tokens na página de Clientes
- [ ] Frontend: botão "Gerar Link do Portal" e "Enviar por E-mail" no card do cliente
- [ ] Integração: link do portal incluído no e-mail de fechamento mensal
- [ ] Segurança: token UUID v4, expiração configurável (30/60/90 dias), revogação imediata
- [ ] Testes vitest para o módulo de portal (validação de token, RBAC, expiração)
- [ ] Checkpoint e entrega

## Fase 16: PWA + Notificações Push
- [ ] manifest.json com nome, ícones, theme_color, display standalone
- [ ] Meta tags PWA no index.html (apple-touch-icon, theme-color, viewport)
- [ ] Service Worker com cache offline (app shell + assets estáticos)
- [ ] Estratégia de cache: network-first para API, cache-first para assets
- [ ] Schema: tabela pushSubscriptions (userId, endpoint, p256dh, auth, createdAt)
- [ ] Migration pnpm db:push executada
- [ ] Backend: gerar VAPID keys e armazenar como secrets
- [ ] Backend: router push (subscribe, unsubscribe, sendToUser, sendToAll)
- [ ] Backend: helper web-push para envio de notificações
- [ ] Frontend: hook usePushNotifications (subscribe, unsubscribe, permission state)
- [ ] Frontend: botão de ativar/desativar notificações no header/perfil
- [ ] Frontend: integração com alertas de prazo (prazos críticos)
- [ ] Frontend: integração com alertas de estoque mínimo
- [ ] Frontend: integração com movimentações Kanban (OS entregue)
- [ ] Testes vitest para push router (subscribe, unsubscribe, RBAC)
- [ ] Checkpoint Fase 16
