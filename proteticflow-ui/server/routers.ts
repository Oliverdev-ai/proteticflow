import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { kanbanRouter } from "./routers/kanban";
import { stockRouter } from "./routers/stock";
import { reportsRouter } from "./routers/reports";
import { pdfReportsRouter } from "./routers/pdfReports";
import { portalRouter } from "./routers/portal";
import { pushNotificationsRouter } from "./routers/pushNotifications";
import * as stockDb from "./db.stock";
import * as jobLogsDb from "./db.jobLogs";
import { getReportsSummary } from "./db.reports";
import { getPrediction } from "./db.predictions";
import { getUserPushSubscriptions } from "./db.push";
import { sendPushToSubscription } from "./push";

// ─── Deadline Check Logic ─────────────────────────────────
async function runDeadlineCheck() {
  const approaching = await db.getJobsApproachingDeadline();
  let created = 0;
  const allUserIds = await db.getAllActiveUserIds();

  for (const job of approaching) {
    const alreadyNotified = await db.hasDeadlineNotification(job.id);
    if (alreadyNotified) continue;

    const pushTitle = `⚠️ Prazo em 24h: ${job.code}`;
    const pushBody = `Trabalho ${job.code} (${job.serviceName}) para ${job.clientName || "cliente"} vence em menos de 24 horas.`;

    for (const userId of allUserIds) {
      // Notificação in-app
      await db.createNotification({
        userId,
        title: pushTitle,
        message: `O trabalho ${job.code} (${job.serviceName}) para ${job.clientName || "cliente"} vence em menos de 24 horas. Status atual: ${job.status}.`,
        type: "warning",
        relatedJobId: job.id,
      });
      // Push notification
      const subs = await getUserPushSubscriptions(userId);
      await Promise.all(
        subs.map(sub =>
          sendPushToSubscription(sub, {
            title: pushTitle,
            body: pushBody,
            url: `/trabalhos`,
            tag: `deadline-${job.id}`,
          })
        )
      );
    }

    await db.logDeadlineNotification(job.id);
    created++;
  }

  return { checked: approaching.length, notificationsCreated: created };
}

// Auto-run deadline check every hour
setInterval(async () => {
  try {
    const result = await runDeadlineCheck();
    if (result.notificationsCreated > 0) {
      console.log(`[DeadlineCheck] ${result.notificationsCreated} notificações criadas de ${result.checked} trabalhos verificados`);
    }
  } catch (err) {
    console.error("[DeadlineCheck] Erro:", err);
  }
}, 60 * 60 * 1000);

// Run once on startup after 30s delay
setTimeout(async () => {
  try {
    const result = await runDeadlineCheck();
    console.log(`[DeadlineCheck] Startup: ${result.notificationsCreated} notificações de ${result.checked} trabalhos`);
  } catch (err) {
    console.error("[DeadlineCheck] Startup error:", err);
  }
}, 30_000);

export const appRouter = router({
  system: systemRouter,
  reports: reportsRouter,
  pdfReports: pdfReportsRouter,
  portal: portalRouter,
  push: pushNotificationsRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Clients ────────────────────────────────────────────
  clients: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional(), status: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return db.listClients(input?.search, input?.status);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getClient(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        clinic: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        city: z.string().optional(),
        state: z.string().max(2).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createClient({ ...input, createdBy: ctx.user.id });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        clinic: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        city: z.string().optional(),
        state: z.string().max(2).optional(),
        status: z.enum(["active", "inactive"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateClient(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteClient(input.id);
        return { success: true };
      }),
  }),

  // ─── Order Blocks (Blocos de OS) ────────────────────────
  // Admin: CRUD completo
  // Colaborador: pode listar e consultar (para saber de quem é a OS)
  orderBlocks: router({
    list: protectedProcedure
      .input(z.object({ clientId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return db.listOrderBlocks(input?.clientId);
      }),

    create: adminProcedure
      .input(z.object({
        clientId: z.number(),
        blockStart: z.number().min(1),
        blockEnd: z.number().min(1),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        if (input.blockEnd <= input.blockStart) {
          throw new Error("O número final do bloco deve ser maior que o inicial.");
        }
        return db.createOrderBlock(input);
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateOrderBlock(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteOrderBlock(input.id);
        return { success: true };
      }),

    // Resolve: dado um número de OS, retorna o cliente dono
    resolveClient: protectedProcedure
      .input(z.object({ orderNumber: z.number() }))
      .query(async ({ input }) => {
        return db.resolveClientByOrderNumber(input.orderNumber);
      }),
  }),

  // ─── Price Items ──────────────────────────────────────────
  prices: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return db.listPriceItems(input?.search);
      }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        category: z.string().min(1),
        material: z.string().optional(),
        estimatedDays: z.number().min(1).default(5),
        price: z.string(),
      }))
      .mutation(async ({ input }) => {
        return db.createPriceItem(input);
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        category: z.string().optional(),
        material: z.string().optional(),
        estimatedDays: z.number().min(1).optional(),
        price: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updatePriceItem(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePriceItem(input.id);
        return { success: true };
      }),
  }),

  // ─── Jobs ─────────────────────────────────────────────────
  // Colaborador: listar, ver, criar, atualizar (dar baixa/mudar status)
  // Admin: deletar
  // NOVO: suporte a orderNumber + patientName + auto-resolve de cliente
  jobs: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional(), status: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return db.listJobs(input?.search, input?.status);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getJob(input.id);
      }),

    getByOrderNumber: protectedProcedure
      .input(z.object({ orderNumber: z.number() }))
      .query(async ({ input }) => {
        return db.getJobByOrderNumber(input.orderNumber);
      }),

    create: protectedProcedure
      .input(z.object({
        clientId: z.number().optional(),
        orderNumber: z.number().optional(),
        priceItemId: z.number().optional(),
        serviceName: z.string().min(1),
        patientName: z.string().optional(),
        tooth: z.string().optional(),
        price: z.string(),
        deadline: z.date(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        let { clientId, orderNumber } = input;

        // Auto-resolve client from order number if clientId not provided
        if (!clientId && orderNumber) {
          const resolved = await db.resolveClientByOrderNumber(orderNumber);
          if (!resolved) {
            throw new Error(`Nenhum cliente encontrado para a OS nº ${orderNumber}. Cadastre o bloco de OS primeiro.`);
          }
          clientId = resolved.clientId;
        }

        if (!clientId) {
          throw new Error("É necessário informar o cliente ou um número de OS válido.");
        }

        // Check if orderNumber is already in use
        if (orderNumber) {
          const existing = await db.getJobByOrderNumber(orderNumber);
          if (existing) {
            throw new Error(`A OS nº ${orderNumber} já está em uso pelo trabalho ${existing.code}.`);
          }
        }

        const code = await db.generateJobCode();
        return db.createJob({
          ...input,
          clientId,
          orderNumber: orderNumber ?? null,
          code,
          createdBy: ctx.user.id,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        orderNumber: z.number().optional(),
        serviceName: z.string().optional(),
        patientName: z.string().optional(),
        tooth: z.string().optional(),
        status: z.enum(["waiting", "in_production", "review", "ready", "delivered", "overdue"]).optional(),
        progress: z.number().min(0).max(100).optional(),
        price: z.string().optional(),
        deadline: z.date().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;

        // If marking as delivered, set deliveredAt and auto-create receivable
        if (data.status === "delivered") {
          await db.updateJob(id, { ...data, deliveredAt: new Date() });
          await db.autoCreateReceivableForJob(id);
        } else {
          await db.updateJob(id, data);
        }

        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteJob(input.id);
        return { success: true };
      }),
  }),

  // ─── Financial: Accounts Receivable ──────────────────────
  // ADMIN ONLY: Todo o módulo financeiro
  financial: router({
    // Contas a Receber
    receivables: router({
      list: adminProcedure
        .input(z.object({
          clientId: z.number().optional(),
          status: z.string().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        }).optional())
        .query(async ({ input }) => {
          return db.listAccountsReceivable(input);
        }),

      create: adminProcedure
        .input(z.object({
          jobId: z.number(),
          clientId: z.number(),
          amount: z.string(),
          description: z.string().optional(),
          dueDate: z.date(),
          notes: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          return db.createAccountReceivable({ ...input, status: "pending" });
        }),

      markPaid: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await db.markAccountReceivablePaid(input.id);
          return { success: true };
        }),

      update: adminProcedure
        .input(z.object({
          id: z.number(),
          amount: z.string().optional(),
          dueDate: z.date().optional(),
          status: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
          notes: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          await db.updateAccountReceivable(id, data);
          return { success: true };
        }),
    }),

    // Fechamento Mensal
    closings: router({
      list: adminProcedure
        .input(z.object({ clientId: z.number().optional() }).optional())
        .query(async ({ input }) => {
          return db.listFinancialClosings(input?.clientId);
        }),

      generate: adminProcedure
        .input(z.object({
          clientId: z.number(),
          period: z.string().regex(/^\d{4}-\d{2}$/, "Formato: YYYY-MM"),
        }))
        .mutation(async ({ input }) => {
          return db.generateMonthlyClosing(input.clientId, input.period);
        }),

      close: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await db.closeMonthlyClosing(input.id);
          return { success: true };
        }),

      markPaid: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await db.markClosingPaid(input.id);
          return { success: true };
        }),
    }),

    // Extrato por Cliente
    statement: adminProcedure
      .input(z.object({
        clientId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return db.getClientStatement(input.clientId, input.startDate, input.endDate);
      }),

    // Contas a Pagar
    payables: router({
      list: adminProcedure
        .input(z.object({
          status: z.string().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        }).optional())
        .query(async ({ input }) => {
          return db.listAccountsPayable(input);
        }),

      create: adminProcedure
        .input(z.object({
          description: z.string().min(1),
          supplier: z.string().optional(),
          category: z.string().optional(),
          amount: z.string(),
          dueDate: z.date(),
          notes: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          return db.createAccountPayable({ ...input, status: "pending" });
        }),

      update: adminProcedure
        .input(z.object({
          id: z.number(),
          description: z.string().optional(),
          supplier: z.string().optional(),
          category: z.string().optional(),
          amount: z.string().optional(),
          dueDate: z.date().optional(),
          status: z.enum(["pending", "paid", "overdue", "cancelled"]).optional(),
          notes: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          await db.updateAccountPayable(id, data);
          return { success: true };
        }),

      markPaid: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await db.markAccountPayablePaid(input.id);
          return { success: true };
        }),
    }),
  }),

  // ─── Dashboard ────────────────────────────────────────────
  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      const stats = await db.getDashboardStats();
      if (ctx.user.role !== "admin") {
        return {
          totalJobs: stats.totalJobs,
          totalClients: stats.totalClients,
          todayDeliveries: stats.todayDeliveries,
          monthlyRevenue: "***",
          overdueJobs: stats.overdueJobs,
        };
      }
      return stats;
    }),
  }),

  // ─── Notifications ────────────────────────────────────────
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.listNotifications(ctx.user.id);
    }),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return db.getUnreadNotificationCount(ctx.user.id);
    }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.markNotificationRead(input.id, ctx.user.id);
        return { success: true };
      }),

    markAllRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        await db.markAllNotificationsRead(ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── User Management (Admin Only) ────────────────────────
  adminUsers: router({
    list: adminProcedure.query(async () => {
      return db.listUsers();
    }),

    invite: adminProcedure
      .input(z.object({
        email: z.string().email(),
        role: z.enum(["user", "admin"]).default("user"),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createInvite({
          email: input.email,
          role: input.role,
          invitedBy: ctx.user.id,
        });
        return { success: true, token: result.token };
      }),

    listInvites: adminProcedure.query(async () => {
      return db.listInvites();
    }),

    revokeInvite: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.revokeInvite(input.id);
        return { success: true };
      }),

    updateRole: adminProcedure
      .input(z.object({
        id: z.number(),
        role: z.enum(["user", "admin"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.id, input.role);
        return { success: true };
      }),

    deactivate: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deactivateUser(input.id);
        return { success: true };
      }),

    reactivate: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.reactivateUser(input.id);
        return { success: true };
      }),
  }),

  // ─── Kanban Board ──────────────────────────────────────
  kanban: kanbanRouter,

  // ─── Estoque ──────────────────────────────────────
  stock: stockRouter,

  // ─── Deadline Check ──────────────────────────────────────
  deadlineCheck: router({
    run: adminProcedure.mutation(async () => {
      return runDeadlineCheck();
    }),
  }),

  // ─── Flow IA (Chat com LLM) ──────────────────────────────
  chat: router({
    history: protectedProcedure.query(async ({ ctx }) => {
      return db.listChatMessages(ctx.user.id);
    }),

    send: protectedProcedure
      .input(z.object({ message: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        // Save user message
        await db.saveChatMessage({
          userId: ctx.user.id,
          role: "user",
          content: input.message,
        });

        const isAdmin = ctx.user.role === "admin";

        // Get context data for the LLM — richer context for better answers
        const [stats, recentJobs, clientsList, orderBlocksList, stockSummary, lowStockItems, reportsSummary, predictionData] = await Promise.all([
          db.getDashboardStats(),
          db.listJobs(undefined, undefined),
          db.listClients(),
          db.listOrderBlocks(),
          stockDb.getStockSummary(),
          stockDb.getLowStockMaterials(),
          getReportsSummary().catch(() => null),
          isAdmin ? getPrediction().catch(() => null) : Promise.resolve(null),
        ]);

        // Fetch financial context only for admin
        let financialSection = "";
        if (isAdmin) {
          try {
            const [receivables, closings, payables] = await Promise.all([
              db.listAccountsReceivable({ status: "pending" }),
              db.listFinancialClosings(),
              db.listAccountsPayable({ status: "pending" }),
            ]);

            const totalReceivable = receivables.reduce((s: number, r: any) => s + parseFloat(r.amount || "0"), 0);
            const totalPayable = payables.reduce((s: number, p: any) => s + parseFloat(p.amount || "0"), 0);

            financialSection = `\nDados Financeiros:\n- Faturamento mensal: R$ ${stats.monthlyRevenue}\n- Total a receber (pendente): R$ ${totalReceivable.toFixed(2)} (${receivables.length} títulos)\n- Total a pagar (pendente): R$ ${totalPayable.toFixed(2)} (${payables.length} contas)\n- Fechamentos recentes: ${closings.length > 0 ? closings.slice(0, 5).map((c: any) => `${c.clientName || "Cliente"} ${c.period}: R$ ${c.totalAmount} (${c.status})`).join("; ") : "Nenhum"}`;
          } catch {
            financialSection = `\n- Faturamento mensal: R$ ${stats.monthlyRevenue}`;
          }
        } else {
          financialSection = "\n- Dados financeiros: [Acesso restrito ao administrador]";
        }

        // Try to resolve OS number from user message
        let osResolution = "";
        const osMatch = input.message.match(/(os|ordem|OS|O\.S\.)\s*n?[°º]?\s*(\d+)/i);
        if (osMatch) {
          const osNum = parseInt(osMatch[2]);
          try {
            const resolved = await db.resolveClientByOrderNumber(osNum);
            if (resolved) {
              osResolution = `\n\nRESOLUÇÃO DE OS DETECTADA:\n- OS nº ${osNum} pertence ao bloco do cliente: ${resolved.clientName} (ID: ${resolved.clientId})\n- Bloco: ${resolved.blockStart} a ${resolved.blockEnd}`;
            }
            const existingJob = await db.getJobByOrderNumber(osNum);
            if (existingJob) {
              osResolution += `\n- Esta OS já está cadastrada como trabalho ${existingJob.code}: ${existingJob.serviceName} | Status: ${existingJob.status}${existingJob.patientName ? ` | Paciente: ${existingJob.patientName}` : ""}`;
            }
          } catch { /* ignore resolution errors */ }
        }

        // Build order blocks context
        const blocksContext = orderBlocksList.length > 0
          ? `\nBLOCOS DE OS CADASTRADOS:\n${orderBlocksList.map((b: any) => `- ${b.clientName || "Cliente " + b.clientId}: OS ${b.blockStart} a ${b.blockEnd}${b.description ? ` (${b.description})` : ""}`).join("\n")}`
          : "\nNenhum bloco de OS cadastrado.";

        // Build per-client summary for financial queries
        let clientFinancialSummary = "";
        if (isAdmin && clientsList.length > 0) {
          clientFinancialSummary = `\n\nRESUMO FINANCEIRO POR CLIENTE:\n${clientsList.slice(0, 30).map((c: any) => `- ${c.name}: ${c.totalJobs} trabalhos | Receita total: R$ ${c.totalRevenue}`).join("\n")}`;
        }

        // Build stock context
        const stockContext = (() => {
          const lowList = lowStockItems.slice(0, 10).map((m: any) =>
            `  - ${m.name}: ${parseFloat(m.currentStock).toFixed(2)} ${m.unit} (mín: ${parseFloat(m.minStock).toFixed(2)})`
          ).join("\n");
          return `\nESTOQUE DO LABORATÓRIO:\n- Materiais ativos: ${stockSummary.totalMaterials}\n- Abaixo do mínimo: ${stockSummary.lowStockCount}\n- Valor total em estoque: R$ ${stockSummary.totalValue.toFixed(2)}\n${stockSummary.lowStockCount > 0 ? `ALERTAS DE REPOSIÇÃO:\n${lowList}` : "- Todos os materiais com estoque adequado."}`;
        })();

        // Build reports summary context
        const reportsContext = reportsSummary && isAdmin
          ? `\nRELATÓRIOS DO MÊS ATUAL:\n- Produção: ${reportsSummary.production.totalJobs} trabalhos (${reportsSummary.production.delivered} entregues, ${reportsSummary.production.overdue} atrasados) | Serviço mais solicitado: ${reportsSummary.production.topService}\n- Financeiro: Receita R$ ${reportsSummary.financial.totalRevenue.toFixed(2)} | Recebido R$ ${reportsSummary.financial.received.toFixed(2)} | Pendente R$ ${reportsSummary.financial.pending.toFixed(2)} | Resultado líquido R$ ${reportsSummary.financial.netResult.toFixed(2)}\n- Estoque: ${reportsSummary.stock.totalMaterials} materiais | ${reportsSummary.stock.lowStock} em alerta | Valor R$ ${reportsSummary.stock.totalValue.toFixed(2)} | Mais consumido: ${reportsSummary.stock.topConsumed}`
          : "";

        // Build PDF reports context for Flow IA
        const pdfReportsContext = isAdmin
          ? `\nRELATÓRIOS PDF DISPONÍVEIS:\n- Acesse /relatorios-pdf na sidebar para gerar e baixar PDFs profissionais.\n- Tipos disponíveis: (1) Fechamento Mensal por Cliente, (2) Trabalhos por Período, (3) Produtividade por Técnico, (4) Trimestral/Anual, (5) Estoque.\n- Configure logo, CNPJ e cores em /config-lab.`
          : "";

        // Build predictive context for Flow IA
        const predictionContext = predictionData && isAdmin
          ? (() => {
              const p = predictionData;
              const factorsSummary = p.factors
                .map((f: any) => `  ${f.type === 'positive' ? '+' : f.type === 'negative' ? '-' : '~'} ${f.label}: ${f.description}`)
                .join('\n');
              const recsSummary = p.recommendations.map((r: string) => `  • ${r}`).join('\n');
              return `\nPREVISÃO DE RECEITA — ${p.targetMonth}:\n- Estimativa final: R$ ${p.finalEstimate.toFixed(2)} (intervalo: R$ ${p.lowerBound.toFixed(2)} – R$ ${p.upperBound.toFixed(2)})\n- Confiança: ${p.confidenceLabel} (${p.confidenceLevel}%)\n- Base WMA (6 meses): R$ ${p.baseEstimate.toFixed(2)} | Pipeline ativo: R$ ${p.pipelineValue.toFixed(2)} (${p.pipelineJobs.length} trabalhos) | Índice sazonal: ${p.seasonalIndex.toFixed(2)}\n- Tendência: ${p.trendDirection} (${p.trendPercent > 0 ? '+' : ''}${p.trendPercent}% vs. trimestre anterior)\nFATORES:\n${factorsSummary || '  Nenhum fator identificado.'}\nRECOMENDAÇÕES:\n${recsSummary}`;
            })()
          : "";

        // Build Kanban production summary
        const kanbanSummary = (() => {
          const statusCounts: Record<string, number> = { waiting: 0, in_production: 0, review: 0, ready: 0, delivered: 0 };
          for (const j of recentJobs) {
            const s = (j as any).status;
            if (statusCounts[s] !== undefined) statusCounts[s]++;
          }
          return `\nQUADRO KANBAN DE PRODUÇÃO:\n- Aguardando: ${statusCounts.waiting}\n- Em Produção: ${statusCounts.in_production}\n- Revisão: ${statusCounts.review}\n- Pronto: ${statusCounts.ready}\n- Entregue: ${statusCounts.delivered}`;
        })();

        const systemPrompt = `Você é a **Flow IA**, assistente inteligente do **ProteticFlow** — sistema de gestão para laboratórios de prótese dentária.
Usuário atual: ${ctx.user.name} (${isAdmin ? "Administrador" : "Colaborador"})

═══ CONTEXTO ATUAL DO LABORATÓRIO ═══
- Trabalhos ativos: ${stats.totalJobs}
- Clientes ativos: ${stats.totalClients}
- Entregas hoje: ${stats.todayDeliveries}
- Trabalhos atrasados: ${stats.overdueJobs}
${financialSection}
${kanbanSummary}
${stockContext}
${reportsContext}
${predictionContext}
${pdfReportsContext}
${blocksContext}
${osResolution}
${clientFinancialSummary}

TRABALHOS RECENTES (últimos 20):
${recentJobs.slice(0, 20).map((j: any) => `- ${j.code}${j.orderNumber ? ` (OS ${j.orderNumber})` : ""}: ${j.serviceName}${j.patientName ? ` | Pac: ${j.patientName}` : ""} | Cliente: ${j.clientName} | Status: ${j.status} | Prazo: ${j.deadline}${isAdmin ? ` | R$ ${j.price}` : ""}`).join("\n")}

CLIENTES:
${clientsList.slice(0, 30).map((c: any) => `- ${c.name} (${c.clinic || "sem clínica"}) | ${c.city || ""}/${c.state || ""} | Trabalhos: ${c.totalJobs}${isAdmin ? ` | Receita: R$ ${c.totalRevenue}` : ""}`).join("\n")}

═══ CAPACIDADES ═══
Você pode ajudar o usuário com:
1. **Consultar trabalhos** por status, cliente, data ou número de OS.
2. **Identificar dono de OS** pelo número (usando os blocos cadastrados). Ex: "De quem é a OS 1250?"
3. **Listar trabalhos** pendentes, atrasados ou com entrega para determinado dia.
4. **Dar baixa em trabalhos** — informar ao usuário que ele pode dar baixa na página de Trabalhos (botão "Entregar") ou arrastar no **Kanban** para "Entregue".
5. **Mover trabalhos no Kanban** — orientar o usuário a abrir a página Kanban (sidebar) e arrastar o card do trabalho para a coluna desejada (Aguardando → Em Produção → Revisão → Pronto → Entregue).
6. **Relatório de trabalhos** — listar trabalhos de um cliente em um período específico.
7. **Status do estoque** — informar estoque atual de um material específico, alertas de reposição e materiais críticos. Ex: "qual o status do estoque de resina acrílica?"
8. **Relatório de consumo de materiais** — orientar o usuário a acessar a aba Movimentações na página Estoque para ver o histórico detalhado.
9. **Relatórios analíticos** — gerar resumo de produção, financeiro e estoque do mês. Orientar o usuário a acessar a página **Relatórios** (sidebar) para visualizar e exportar PDF/CSV.
10. **Previsão de receita** — quando o usuário perguntar sobre previsão, estimativa ou projeção de receita, use os dados da seção PREVISÃO DE RECEITA acima para responder com: (a) estimativa central, (b) intervalo de confiança, (c) nível de confiança, (d) fatores positivos e negativos, (e) recomendações acionáveis. Seja claro sobre as limitações do modelo quando os dados históricos forem escassos.
11. **Relatórios PDF** — quando o usuário pedir para "gerar relatório mensal", "relatório trimestral", "relatório anual", "relatório de produtividade" ou "relatório de estoque": (a) oriente-o a acessar **Relatórios PDF** na sidebar (ícone de download), (b) explique qual tipo de relatório usar e como configurar o período, (c) mencione que pode configurar logo e dados do lab em **Config Lab** (sidebar, seção Configurações).
${isAdmin ? `9. **Fechamento de contas mensal** — informar o total de débitos de cada cliente no mês, com detalhamento por trabalho.
8. **Extrato por cliente** — mostrar todos os trabalhos entregues e valores pendentes/pagos.
9. **Relatório financeiro geral** — resumo trimestral ou anual do laboratório.
10. **Contas a receber/pagar** — informar títulos pendentes e vencidos.` : `7. Consultar informações operacionais (sem dados financeiros).`}

═══ REGRAS ═══
1. Responda sempre em **português brasileiro**.
2. Seja direto, profissional e útil. Sem floreios.
3. Use **dados reais** do laboratório nas respostas — nunca invente números.
4. Formate com markdown: **negrito**, listas, tabelas quando apropriado.
5. Se não tiver dados suficientes, diga honestamente.
6. Quando o usuário pedir para **cadastrar OS, dar baixa, fazer fechamento**: oriente-o a usar a interface correspondente (Trabalhos, Financeiro). Explique exatamente onde ir e o que clicar.
7. Para consultas financeiras de um cliente específico, use os dados disponíveis para montar uma tabela detalhada.
${!isAdmin ? "8. **NUNCA** revele dados financeiros (preços, faturamento, receita). Este usuário é colaborador." : ""}`;

        // Get chat history for context
        const history = await db.listChatMessages(ctx.user.id, 10);

        const messages = [
          { role: "system" as const, content: systemPrompt },
          ...history.map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user" as const, content: input.message },
        ];

        try {
          const response = await invokeLLM({ messages });
          const content = typeof response.choices[0]?.message?.content === "string"
            ? response.choices[0].message.content
            : "Desculpe, não consegui processar sua solicitação. Tente novamente.";

          await db.saveChatMessage({
            userId: ctx.user.id,
            role: "assistant",
            content,
          });

          return { content };
        } catch (error) {
          const fallback = "Desculpe, estou com dificuldades técnicas no momento. Tente novamente em alguns instantes.";
          await db.saveChatMessage({
            userId: ctx.user.id,
            role: "assistant",
            content: fallback,
          });
          return { content: fallback };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
