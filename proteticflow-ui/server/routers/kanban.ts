/**
 * Kanban Router — ProteticFlow
 * Procedimentos tRPC para o quadro Kanban de produção.
 * Inclui: getBoard, moveJob (com jobLog), assignJob, getMetrics, getJobHistory
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import * as db from "../db";
import * as jobLogsDb from "../db.jobLogs";
import { getUserPushSubscriptions } from "../db.push";
import { sendPushToSubscription } from "../push";

// Status válidos para o Kanban (fluxo de produção)
const KANBAN_STATUSES = ["waiting", "in_production", "review", "ready", "delivered"] as const;
type KanbanStatus = typeof KANBAN_STATUSES[number];

// Mapa de transições válidas
const VALID_TRANSITIONS: Record<string, string[]> = {
  waiting: ["in_production", "review"],
  in_production: ["review", "ready", "waiting"],
  review: ["in_production", "ready", "waiting"],
  ready: ["delivered", "in_production", "review"],
  delivered: ["ready", "in_production"],
};

const STATUS_LABELS: Record<string, string> = {
  waiting: "Aguardando",
  in_production: "Em Produção",
  review: "Revisão",
  ready: "Pronto",
  delivered: "Entregue",
  overdue: "Atrasado",
};

const PROGRESS_MAP: Record<string, number> = {
  waiting: 0,
  in_production: 30,
  review: 60,
  ready: 90,
  delivered: 100,
};

export const kanbanRouter = router({
  /**
   * getBoard — Retorna todos os trabalhos agrupados por status.
   * Inclui assignedTo com nome do responsável.
   */
  getBoard: protectedProcedure
    .input(
      z.object({
        clientId: z.number().optional(),
        search: z.string().optional(),
        assignedTo: z.number().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const allJobs = await db.listJobs(input?.search);
      const activeUsers = await jobLogsDb.listActiveUsers();
      const userMap = new Map(activeUsers.map(u => [u.id, u.name]));

      // Filtros
      let filtered = allJobs;
      if (input?.clientId) {
        filtered = filtered.filter((j: any) => j.clientId === input.clientId);
      }
      if (input?.assignedTo) {
        filtered = filtered.filter((j: any) => j.assignedTo === input.assignedTo);
      }
      if (input?.dateFrom) {
        filtered = filtered.filter((j: any) => new Date(j.deadline) >= input.dateFrom!);
      }
      if (input?.dateTo) {
        filtered = filtered.filter((j: any) => new Date(j.deadline) <= input.dateTo!);
      }

      // Enriquecer com nome do responsável
      const enriched = filtered.map((j: any) => ({
        ...j,
        assignedToName: j.assignedTo ? (userMap.get(j.assignedTo) ?? null) : null,
      }));

      // Agrupar por status
      const columns: Record<string, typeof enriched> = {
        waiting: [],
        in_production: [],
        review: [],
        ready: [],
        delivered: [],
      };

      for (const job of enriched) {
        const status = job.status as string;
        if (columns[status]) {
          columns[status].push(job);
        } else {
          columns.waiting.push(job); // overdue → waiting
        }
      }

      // Ordenar por deadline (mais urgente primeiro)
      for (const status of Object.keys(columns)) {
        columns[status].sort((a: any, b: any) =>
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        );
      }

      return {
        columns,
        totalCount: enriched.length,
        statuses: KANBAN_STATUSES,
        users: activeUsers,
      };
    }),

  /**
   * moveJob — Move um trabalho para um novo status.
   * Registra log em jobLogs automaticamente.
   */
  moveJob: protectedProcedure
    .input(
      z.object({
        jobId: z.number(),
        newStatus: z.enum(["waiting", "in_production", "review", "ready", "delivered"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const job = await db.getJob(input.jobId);
      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Trabalho não encontrado." });
      }

      const currentStatus = job.status;
      const newStatus = input.newStatus;

      // Validar transição
      const allowed = VALID_TRANSITIONS[currentStatus];
      if (!allowed || !allowed.includes(newStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Transição inválida: não é possível mover de "${STATUS_LABELS[currentStatus] || currentStatus}" para "${STATUS_LABELS[newStatus]}".`,
        });
      }

      // Atualizar job
      if (newStatus === "delivered") {
        await db.updateJob(input.jobId, {
          status: "delivered",
          deliveredAt: new Date(),
          progress: 100,
        });
        await db.autoCreateReceivableForJob(input.jobId);
      } else {
        await db.updateJob(input.jobId, {
          status: newStatus as any,
          progress: PROGRESS_MAP[newStatus] ?? (job as any).progress,
          ...(currentStatus === "delivered" ? { deliveredAt: null } : {}),
        });
      }

      // Registrar log de movimentação
      await jobLogsDb.createJobLog({
        jobId: input.jobId,
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.email ?? "Usuário",
        fromStatus: currentStatus,
        toStatus: newStatus,
        notes: input.notes,
      });

      // Notificação in-app
      await db.createNotification({
        userId: ctx.user.id,
        title: `Trabalho ${job.code} movido`,
        message: `${job.code} (${(job as any).serviceName}) movido de "${STATUS_LABELS[currentStatus] || currentStatus}" para "${STATUS_LABELS[newStatus]}".`,
        type: newStatus === "delivered" ? "success" : "info",
        relatedJobId: input.jobId,
      });

      // Push notification para todos os usuários ativos
      const allUserIds = await db.getAllActiveUserIds();
      const pushTitle = newStatus === "delivered"
        ? `✅ Trabalho entregue: ${job.code}`
        : `🔄 Kanban: ${job.code}`;
      const pushBody = `${job.code} movido para "${STATUS_LABELS[newStatus]}"`;
      await Promise.all(
        allUserIds.map(async (uid) => {
          const subs = await getUserPushSubscriptions(uid);
          return Promise.all(
            subs.map(sub =>
              sendPushToSubscription(sub, {
                title: pushTitle,
                body: pushBody,
                url: `/kanban`,
                tag: `kanban-move-${input.jobId}`,
              })
            )
          );
        })
      );

      return {
        success: true,
        jobId: input.jobId,
        previousStatus: currentStatus,
        newStatus,
      };
    }),

  /**
   * assignJob — Atribui um responsável a um trabalho.
   */
  assignJob: protectedProcedure
    .input(
      z.object({
        jobId: z.number(),
        assignedTo: z.number().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const job = await db.getJob(input.jobId);
      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Trabalho não encontrado." });
      }

      await jobLogsDb.assignJob(input.jobId, input.assignedTo);

      // Log da atribuição
      const assigneeName = input.assignedTo
        ? (await jobLogsDb.listActiveUsers()).find(u => u.id === input.assignedTo)?.name ?? "Usuário"
        : null;

      await jobLogsDb.createJobLog({
        jobId: input.jobId,
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.email ?? "Usuário",
        fromStatus: (job as any).status,
        toStatus: (job as any).status,
        notes: assigneeName
          ? `Responsável atribuído: ${assigneeName}`
          : "Responsável removido",
      });

      return { success: true, assignedTo: input.assignedTo };
    }),

  /**
   * getJobHistory — Retorna o histórico de movimentações de um trabalho.
   */
  getJobHistory: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input }) => {
      const logs = await jobLogsDb.listJobLogs(input.jobId);
      return logs.map(log => ({
        ...log,
        fromStatusLabel: log.fromStatus ? (STATUS_LABELS[log.fromStatus] ?? log.fromStatus) : null,
        toStatusLabel: STATUS_LABELS[log.toStatus] ?? log.toStatus,
      }));
    }),

  /**
   * getRecentActivity — Últimas movimentações no Kanban (feed de atividade).
   */
  getRecentActivity: protectedProcedure
    .query(async () => {
      const logs = await jobLogsDb.listRecentLogs(30);
      return logs.map(log => ({
        ...log,
        fromStatusLabel: log.fromStatus ? (STATUS_LABELS[log.fromStatus] ?? log.fromStatus) : null,
        toStatusLabel: STATUS_LABELS[log.toStatus] ?? log.toStatus,
      }));
    }),

  /**
   * getMetrics — Métricas de produção: tempo médio por coluna, throughput, gargalo.
   */
  getMetrics: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const metrics = await jobLogsDb.getKanbanMetrics(input?.startDate, input?.endDate);

      // Formatar tempo para exibição
      const formatDuration = (seconds: number): string => {
        if (seconds === 0) return "—";
        if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
        if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
        return `${(seconds / 86400).toFixed(1)}d`;
      };

      const avgFormatted: Record<string, string> = {};
      for (const [status, secs] of Object.entries(metrics.avgTimePerStatus)) {
        avgFormatted[status] = formatDuration(secs);
      }

      return {
        ...metrics,
        avgTimeFormatted: avgFormatted,
        bottleneckLabel: metrics.bottleneck
          ? (STATUS_LABELS[metrics.bottleneck] ?? metrics.bottleneck)
          : null,
      };
    }),

  /**
   * getValidTransitions — Retorna as transições válidas para um status.
   */
  getValidTransitions: protectedProcedure
    .input(z.object({ status: z.string() }))
    .query(({ input }) => {
      return VALID_TRANSITIONS[input.status] || [];
    }),
});
