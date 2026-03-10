🦷 ProteticFlow — Documento Operacional para IA Técnica
1️⃣ Objetivo do Sistema

Construir um SaaS escalável para gestão de laboratórios de prótese com arquitetura API-First e futura integração de módulos de IA preditiva.

2️⃣ Arquitetura Obrigatória
Estrutura de Apps
apps/
  core/
  accounts/
  dashboard/
  clients/
  jobs/
  pricing/
  payroll/

Novas features devem ser criadas como apps isolados.

3️⃣ Padrões Técnicos Obrigatórios
Autenticação

Sempre utilizar CustomUser

Sempre proteger endpoints com IsAuthenticated

JWT obrigatório

API

Prefixo obrigatório: /api/v1/

Nunca criar endpoints fora do versionamento

Respostas sempre em JSON

View Layer

Preferir ModelViewSet

Usar DefaultRouter

Evitar APIView salvo quando necessário

Serializers

Sempre separar:

Serializer de leitura

Serializer de escrita quando necessário

Banco

SQLite apenas para dev

Código deve ser compatível com PostgreSQL

4️⃣ Contrato Padrão de Resposta

Todas as respostas devem seguir estrutura:

{
  "success": true,
  "data": {},
  "errors": null
}

Evita inconsistência futura.

5️⃣ Regras de Escalabilidade

Código deve suportar 10.000+ pedidos ativos

Consultas devem usar select_related / prefetch_related

Nunca fazer queries dentro de loops

6️⃣ Regras de Segurança

Nunca hardcode secrets

Sempre usar variáveis de ambiente

Validar permissões por role futuramente

7️⃣ Roadmap Técnico Prioritário

Dashboard Summary

CRUD completo de Jobs

CRUD Clients

Pricing inteligente

Camada de IA separada (não misturar com regras de negócio)