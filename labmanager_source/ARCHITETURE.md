🏗 ProteticFlow — Architecture Document
1. Architectural Philosophy

ProteticFlow follows:

API-First Architecture

Modular Domain Separation

JWT-based Stateless Authentication

Scalable SaaS Design

2. High-Level Structure
backend/
  apps/
    accounts/
    core/
    dashboard/
    clients/
    jobs/
    pricing/
    payroll/

Each business domain must be isolated into its own Django app.

3. API Standards

All endpoints must use /api/v1/

All endpoints must require authentication unless explicitly public

All responses must follow standard contract:

{
  "success": true,
  "data": {},
  "errors": null
}
4. Authentication

CustomUser is mandatory

JWT required

No session-based authentication

5. Database Strategy

Development:

SQLite

Production:

PostgreSQL

Rules:

Avoid SQLite-specific features

Optimize with select_related and prefetch_related

6. AI Layer Strategy

AI logic must:

Be isolated from core domain logic

Never manipulate critical financial data directly

Operate through service layers

7. Scalability Principles

No business logic in views

No heavy logic in serializers

Services layer recommended for complex operations

Code must support 10k+ records without performance degradation