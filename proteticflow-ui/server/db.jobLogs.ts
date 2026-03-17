/**
 * db.jobLogs.ts — ProteticFlow
 * Helpers para histórico de movimentações Kanban (jobLogs)
 * e métricas de produção por coluna.
 */
import { getDb } from "./db";
import { jobLogs, jobs, users } from "../drizzle/schema";
import { eq, desc, and, gte, lte, sql, count, asc } from "drizzle-orm";

// ─── Types ─────────────────────────────────────────────────

export interface CreateJobLogInput {
  jobId: number;
  userId?: number;
  userName?: string;
  fromStatus?: string;
  toStatus: string;
  notes?: string;
}

export interface KanbanMetrics {
  avgTimePerStatus: Record<string, number>; // seconds
  throughput: number; // jobs delivered in period
  bottleneck: string | null; // status with highest avg time
  totalActive: number;
  deliveredThisMonth: number;
  overdueCount: number;
}

// ─── Job Logs CRUD ─────────────────────────────────────────

export async function createJobLog(input: CreateJobLogInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(jobLogs).values({
    jobId: input.jobId,
    userId: input.userId ?? null,
    userName: input.userName ?? null,
    fromStatus: input.fromStatus ?? null,
    toStatus: input.toStatus,
    notes: input.notes ?? null,
  });
  return result;
}

export async function listJobLogs(jobId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(jobLogs)
    .where(eq(jobLogs.jobId, jobId))
    .orderBy(desc(jobLogs.createdAt));
  return rows;
}

export async function listRecentLogs(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: jobLogs.id,
      jobId: jobLogs.jobId,
      jobCode: jobs.code,
      serviceName: jobs.serviceName,
      userId: jobLogs.userId,
      userName: jobLogs.userName,
      fromStatus: jobLogs.fromStatus,
      toStatus: jobLogs.toStatus,
      notes: jobLogs.notes,
      createdAt: jobLogs.createdAt,
    })
    .from(jobLogs)
    .leftJoin(jobs, eq(jobLogs.jobId, jobs.id))
    .orderBy(desc(jobLogs.createdAt))
    .limit(limit);
  return rows;
}

// ─── Assign Job ────────────────────────────────────────────

export async function assignJob(jobId: number, assignedTo: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(jobs)
    .set({ assignedTo, updatedAt: new Date() })
    .where(eq(jobs.id, jobId));
}

// ─── Kanban Metrics ────────────────────────────────────────

/**
 * Calcula métricas de produção Kanban:
 * - Tempo médio que um trabalho fica em cada status (via jobLogs)
 * - Throughput (entregas no mês)
 * - Gargalo (status com maior tempo médio)
 */
export async function getKanbanMetrics(startDate?: Date, endDate?: Date): Promise<KanbanMetrics> {
  const db = await getDb();
  if (!db) {
    return {
      avgTimePerStatus: { waiting: 0, in_production: 0, review: 0, ready: 0 },
      throughput: 0,
      bottleneck: null,
      totalActive: 0,
      deliveredThisMonth: 0,
      overdueCount: 0,
    };
  }

  const now = new Date();
  const monthStart = startDate ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = endDate ?? new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Get all logs in period to compute time-in-status
  const logsInPeriod = await db
    .select({
      jobId: jobLogs.jobId,
      fromStatus: jobLogs.fromStatus,
      toStatus: jobLogs.toStatus,
      createdAt: jobLogs.createdAt,
    })
    .from(jobLogs)
    .where(
      and(
        gte(jobLogs.createdAt, monthStart),
        lte(jobLogs.createdAt, monthEnd)
      )
    )
    .orderBy(jobLogs.jobId, asc(jobLogs.createdAt));

  // Compute avg time per status by grouping consecutive transitions
  const timeInStatus: Record<string, number[]> = {
    waiting: [],
    in_production: [],
    review: [],
    ready: [],
  };

  // Group logs by jobId
  const byJob: Record<number, typeof logsInPeriod> = {};
  for (const log of logsInPeriod) {
    if (!byJob[log.jobId]) byJob[log.jobId] = [];
    byJob[log.jobId].push(log);
  }

  for (const jobLogsArr of Object.values(byJob)) {
    for (let i = 0; i < jobLogsArr.length - 1; i++) {
      const curr = jobLogsArr[i];
      const next = jobLogsArr[i + 1];
      const fromStatus = curr.toStatus;
      if (fromStatus && timeInStatus[fromStatus] !== undefined) {
        const durationSec = (next.createdAt.getTime() - curr.createdAt.getTime()) / 1000;
        if (durationSec > 0 && durationSec < 30 * 24 * 3600) {
          timeInStatus[fromStatus].push(durationSec);
        }
      }
    }
  }

  const avgTimePerStatus: Record<string, number> = {};
  let bottleneck: string | null = null;
  let maxAvg = 0;

  for (const [status, times] of Object.entries(timeInStatus)) {
    const avg = times.length > 0
      ? times.reduce((a, b) => a + b, 0) / times.length
      : 0;
    avgTimePerStatus[status] = Math.round(avg);
    if (avg > maxAvg) {
      maxAvg = avg;
      bottleneck = status;
    }
  }

  // Throughput: delivered this month
  const [throughputRow] = await db
    .select({ cnt: count() })
    .from(jobs)
    .where(
      and(
        eq(jobs.status, "delivered"),
        gte(jobs.deliveredAt!, monthStart),
        lte(jobs.deliveredAt!, monthEnd)
      )
    );
  const throughput = throughputRow?.cnt ?? 0;

  // Total active (not delivered)
  const [activeRow] = await db
    .select({ cnt: count() })
    .from(jobs)
    .where(
      sql`${jobs.status} NOT IN ('delivered')`
    );
  const totalActive = activeRow?.cnt ?? 0;

  // Overdue
  const [overdueRow] = await db
    .select({ cnt: count() })
    .from(jobs)
    .where(eq(jobs.status, "overdue"));
  const overdueCount = overdueRow?.cnt ?? 0;

  return {
    avgTimePerStatus,
    throughput,
    bottleneck: maxAvg > 0 ? bottleneck : null,
    totalActive,
    deliveredThisMonth: throughput,
    overdueCount,
  };
}

// ─── Users list for assignment ──────────────────────────────

export async function listActiveUsers() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.isActive, true))
    .orderBy(asc(users.name));
  return rows;
}
