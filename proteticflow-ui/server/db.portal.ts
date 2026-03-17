/**
 * db.portal.ts — Helpers de banco para o Portal do Cliente
 *
 * Segurança:
 * - Token UUID v4 (128 bits de entropia)
 * - Expiração obrigatória (30/60/90 dias)
 * - Revogação imediata via isActive=false
 * - lastAccessAt e accessCount para auditoria
 * - Dados retornados são mínimos (sem dados financeiros)
 */

import { getDb } from "./db";
import { clientPortalTokens, clients, jobs, jobLogs, labSettings } from "../drizzle/schema";
import { eq, and, desc, gte, isNull, or } from "drizzle-orm";
import { randomUUID } from "crypto";

// ─── Tipos ──────────────────────────────────────────────────

export interface PortalTokenInfo {
  id: number;
  clientId: number;
  token: string;
  label: string | null;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
  lastAccessAt: Date | null;
  accessCount: number;
  clientName: string;
}

export interface PortalJobData {
  id: number;
  code: string;
  orderNumber: number | null;
  serviceName: string;
  patientName: string | null;
  tooth: string | null;
  status: string;
  progress: number;
  deadline: Date;
  deliveredAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  logs: Array<{
    id: number;
    fromStatus: string | null;
    toStatus: string;
    notes: string | null;
    userName: string | null;
    createdAt: Date;
  }>;
}

export interface PortalData {
  client: {
    id: number;
    name: string;
    clinic: string | null;
    city: string | null;
    state: string | null;
  };
  lab: {
    labName: string;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
  };
  jobs: PortalJobData[];
  summary: {
    total: number;
    waiting: number;
    inProduction: number;
    review: number;
    ready: number;
    delivered: number;
    overdue: number;
  };
  tokenInfo: {
    label: string | null;
    expiresAt: Date;
    accessCount: number;
  };
}

// ─── Geração de Token ────────────────────────────────────────

export async function generatePortalToken(
  clientId: number,
  label: string,
  expiresDays: 30 | 60 | 90 | 180 | 365
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const token = randomUUID().replace(/-/g, ""); // 32 chars hex
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresDays);

  await db.insert(clientPortalTokens).values({
    clientId,
    token,
    label,
    expiresAt,
    isActive: true,
    accessCount: 0,
  });

  return token;
}

// ─── Validação de Token ──────────────────────────────────────

export async function validatePortalToken(token: string): Promise<{
  valid: boolean;
  tokenRow?: typeof clientPortalTokens.$inferSelect;
  reason?: string;
}> {
  const db = await getDb();
  if (!db) return { valid: false, reason: "Database not available" };

  const rows = await db
    .select()
    .from(clientPortalTokens)
    .where(eq(clientPortalTokens.token, token))
    .limit(1);

  if (rows.length === 0) return { valid: false, reason: "Token não encontrado" };

  const tokenRow = rows[0];

  if (!tokenRow.isActive) return { valid: false, reason: "Token revogado" };

  if (new Date() > tokenRow.expiresAt) {
    return { valid: false, reason: "Token expirado" };
  }

  return { valid: true, tokenRow };
}

// ─── Buscar Dados do Portal ──────────────────────────────────

export async function getPortalData(token: string): Promise<PortalData | null> {
  const db = await getDb();
  if (!db) return null;

  const validation = await validatePortalToken(token);
  if (!validation.valid || !validation.tokenRow) return null;

  const { tokenRow } = validation;

  // Buscar cliente
  const clientRows = await db
    .select()
    .from(clients)
    .where(eq(clients.id, tokenRow.clientId))
    .limit(1);

  if (clientRows.length === 0) return null;
  const client = clientRows[0];

  // Buscar configurações do lab
  const labRows = await db.select().from(labSettings).limit(1);
  const lab = labRows[0] ?? {
    labName: "Laboratório de Prótese",
    phone: null,
    email: null,
    logoUrl: null,
    primaryColor: "#1a56db",
  };

  // Buscar trabalhos do cliente (últimos 6 meses + todos não entregues)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const jobRows = await db
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.clientId, tokenRow.clientId),
        or(
          gte(jobs.createdAt, sixMonthsAgo),
          // Trabalhos não entregues independente da data
          and(
            isNull(jobs.deliveredAt)
          )
        )
      )
    )
    .orderBy(desc(jobs.createdAt));

  // Buscar logs de cada trabalho
  const jobIds = jobRows.map((j) => j.id);
  let allLogs: Array<typeof jobLogs.$inferSelect> = [];

  if (jobIds.length > 0) {
    // Buscar logs dos últimos 30 trabalhos para não sobrecarregar
    const recentJobIds = jobIds.slice(0, 30);
    for (const jobId of recentJobIds) {
      const logs = await db
        .select()
        .from(jobLogs)
        .where(eq(jobLogs.jobId, jobId))
        .orderBy(desc(jobLogs.createdAt));
      allLogs = [...allLogs, ...logs];
    }
  }

  // Montar jobs com logs
  const jobsWithLogs: PortalJobData[] = jobRows.map((job) => ({
    id: job.id,
    code: job.code,
    orderNumber: job.orderNumber,
    serviceName: job.serviceName,
    patientName: job.patientName,
    tooth: job.tooth,
    status: job.status,
    progress: job.progress,
    deadline: job.deadline,
    deliveredAt: job.deliveredAt,
    notes: job.notes,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    logs: allLogs
      .filter((l) => l.jobId === job.id)
      .map((l) => ({
        id: l.id,
        fromStatus: l.fromStatus,
        toStatus: l.toStatus,
        notes: l.notes,
        userName: l.userName,
        createdAt: l.createdAt,
      })),
  }));

  // Calcular summary
  const summary = {
    total: jobRows.length,
    waiting: jobRows.filter((j) => j.status === "waiting").length,
    inProduction: jobRows.filter((j) => j.status === "in_production").length,
    review: jobRows.filter((j) => j.status === "review").length,
    ready: jobRows.filter((j) => j.status === "ready").length,
    delivered: jobRows.filter((j) => j.status === "delivered").length,
    overdue: jobRows.filter((j) => j.status === "overdue").length,
  };

  return {
    client: {
      id: client.id,
      name: client.name,
      clinic: client.clinic,
      city: client.city,
      state: client.state,
    },
    lab: {
      labName: lab.labName,
      phone: lab.phone,
      email: lab.email,
      logoUrl: lab.logoUrl,
      primaryColor: lab.primaryColor,
    },
    jobs: jobsWithLogs,
    summary,
    tokenInfo: {
      label: tokenRow.label,
      expiresAt: tokenRow.expiresAt,
      accessCount: tokenRow.accessCount,
    },
  };
}

// ─── Rastrear Acesso ─────────────────────────────────────────

export async function trackPortalAccess(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(clientPortalTokens)
    .set({
      lastAccessAt: new Date(),
    })
    .where(eq(clientPortalTokens.token, token));

  // Incrementar accessCount via select + update
  const rows = await db
    .select({ accessCount: clientPortalTokens.accessCount })
    .from(clientPortalTokens)
    .where(eq(clientPortalTokens.token, token))
    .limit(1);

  if (rows.length > 0) {
    await db
      .update(clientPortalTokens)
      .set({
        lastAccessAt: new Date(),
        accessCount: (rows[0].accessCount ?? 0) + 1,
      })
      .where(eq(clientPortalTokens.token, token));
  }
}

// ─── Admin: Listar Tokens por Cliente ────────────────────────

export async function listPortalTokens(clientId: number): Promise<PortalTokenInfo[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: clientPortalTokens.id,
      clientId: clientPortalTokens.clientId,
      token: clientPortalTokens.token,
      label: clientPortalTokens.label,
      expiresAt: clientPortalTokens.expiresAt,
      isActive: clientPortalTokens.isActive,
      createdAt: clientPortalTokens.createdAt,
      lastAccessAt: clientPortalTokens.lastAccessAt,
      accessCount: clientPortalTokens.accessCount,
      clientName: clients.name,
    })
    .from(clientPortalTokens)
    .innerJoin(clients, eq(clients.id, clientPortalTokens.clientId))
    .where(eq(clientPortalTokens.clientId, clientId))
    .orderBy(desc(clientPortalTokens.createdAt));

  return rows;
}

// ─── Admin: Revogar Token ────────────────────────────────────

export async function revokePortalToken(tokenId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(clientPortalTokens)
    .set({ isActive: false })
    .where(eq(clientPortalTokens.id, tokenId));
}

// ─── Admin: Deletar Token ────────────────────────────────────

export async function deletePortalToken(tokenId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(clientPortalTokens)
    .where(eq(clientPortalTokens.id, tokenId));
}
