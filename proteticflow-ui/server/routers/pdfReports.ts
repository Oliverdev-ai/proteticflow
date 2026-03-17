/**
 * pdfReports.ts — ProteticFlow
 * Router tRPC para geração de PDFs server-side.
 * Tipos: monthly_closing | jobs_period | productivity | quarterly_annual | stock | lab_settings
 *
 * Todos os endpoints são adminProcedure (RBAC).
 * Retorna base64 do PDF para download no frontend.
 */
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { getLabSettings, upsertLabSettings } from "../db.labSettings";
import { buildPdfDocument, fmtBRL, fmtDate, fmtStatus } from "../pdf.engine";
import { getDb } from "../db";
import { storagePut } from "../storage";
import { sendEmail, buildMonthlyClosingEmailHtml, isEmailConfigured } from "../email";
import {
  jobs, clients, users, accountsReceivable, financialClosings,
  materials, stockMovements, materialCategories,
} from "../../drizzle/schema";
import { and, gte, lte, eq, desc, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ─── Helpers ──────────────────────────────────────────────

function periodLabel(year: number, month?: number, quarter?: number): string {
  if (quarter) {
    const qStart = ["Jan", "Abr", "Jul", "Out"][quarter - 1];
    const qEnd = ["Mar", "Jun", "Set", "Dez"][quarter - 1];
    return `${qStart}–${qEnd}/${year}`;
  }
  if (month) {
    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    return `${months[month - 1]}/${year}`;
  }
  return `${year}`;
}

function periodRange(year: number, month?: number, quarter?: number): { start: Date; end: Date } {
  if (month) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    return { start, end };
  }
  if (quarter) {
    const startMonth = (quarter - 1) * 3;
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, startMonth + 3, 0, 23, 59, 59);
    return { start, end };
  }
  return { start: new Date(year, 0, 1), end: new Date(year, 11, 31, 23, 59, 59) };
}

// ─── Router ───────────────────────────────────────────────

export const pdfReportsRouter = router({

  // ─── Lab Settings ───────────────────────────────────────

  getLabSettings: protectedProcedure.query(async () => {
    return getLabSettings();
  }),

  updateLabSettings: adminProcedure
    .input(z.object({
      labName: z.string().min(1).max(256).optional(),
      cnpj: z.string().max(18).nullable().optional(),
      phone: z.string().max(32).nullable().optional(),
      email: z.string().email().max(320).nullable().optional(),
      address: z.string().max(512).nullable().optional(),
      city: z.string().max(128).nullable().optional(),
      state: z.string().max(2).nullable().optional(),
      zipCode: z.string().max(10).nullable().optional(),
      logoUrl: z.string().url().nullable().optional(),
      reportHeader: z.string().max(512).nullable().optional(),
      reportFooter: z.string().max(512).nullable().optional(),
      primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      return upsertLabSettings(input);
    }),

  // ─── Upload Logo ─────────────────────────────────────────

  uploadLogo: adminProcedure
    .input(z.object({
      base64: z.string(), // base64 da imagem
      mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]),
      filename: z.string().max(128),
    }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      const ext = input.mimeType.split("/")[1];
      const key = `lab-logos/logo-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      // Salvar URL nas configurações
      await upsertLabSettings({ logoUrl: url });
      return { url };
    }),

  // ─── Relatório 1: Fechamento Mensal por Cliente ──────────

  generateMonthlyClosing: adminProcedure
    .input(z.object({
      year: z.number().int().min(2020).max(2100),
      month: z.number().int().min(1).max(12),
      clientId: z.number().int().optional(), // null = todos os clientes
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const lab = await getLabSettings();
      const { start, end } = periodRange(input.year, input.month);
      const period = periodLabel(input.year, input.month);

      // Buscar trabalhos entregues no período
      const conditions = [
        gte(jobs.createdAt, start),
        lte(jobs.createdAt, end),
        eq(jobs.status, "delivered" as any),
      ];
      if (input.clientId) conditions.push(eq(jobs.clientId, input.clientId));

      const jobRows = await db
        .select({
          id: jobs.id,
          code: jobs.code,
          orderNumber: jobs.orderNumber,
          clientId: jobs.clientId,
          clientName: clients.name,
          serviceName: jobs.serviceName,
          patientName: jobs.patientName,
          price: jobs.price,
          status: jobs.status,
          deadline: jobs.deadline,
          createdAt: jobs.createdAt,
        })
        .from(jobs)
        .leftJoin(clients, eq(jobs.clientId, clients.id))
        .where(and(...conditions))
        .orderBy(clients.name, jobs.createdAt);

      // Agrupar por cliente
      const byClient = new Map<string, { clientName: string; rows: typeof jobRows; total: number }>();
      for (const row of jobRows) {
        const key = row.clientName ?? "Sem Cliente";
        if (!byClient.has(key)) byClient.set(key, { clientName: key, rows: [], total: 0 });
        const entry = byClient.get(key)!;
        entry.rows.push(row as any);
        entry.total += parseFloat(String(row.price ?? "0"));
      }

      const grandTotal = jobRows.reduce((s, r) => s + parseFloat(String(r.price ?? "0")), 0);

      // Buscar contas a receber do período
      const arRows = await db
        .select()
        .from(accountsReceivable)
        .where(and(gte(accountsReceivable.dueDate, start), lte(accountsReceivable.dueDate, end)))
        .orderBy(accountsReceivable.dueDate);

      const totalReceived = arRows.filter((r: any) => r.status === "paid").reduce((s: number, r: any) => s + parseFloat(String(r.amount ?? "0")), 0);
      const totalPending = arRows.filter((r: any) => r.status !== "paid" && r.status !== "cancelled").reduce((s: number, r: any) => s + parseFloat(String(r.amount ?? "0")), 0);

      // Build sections
      const sections: any[] = [
        {
          kpis: [
            { label: "Total Faturado", value: fmtBRL(grandTotal), sub: `${jobRows.length} trabalhos` },
            { label: "Total Recebido", value: fmtBRL(totalReceived) },
            { label: "A Receber", value: fmtBRL(totalPending) },
            { label: "Clientes Atendidos", value: String(byClient.size) },
          ],
        },
        { spacer: 4 },
      ];

      // Seção por cliente
      for (const [, entry] of Array.from(byClient.entries())) {
        sections.push({
          title: entry.clientName,
          subtitle: `${entry.rows.length} trabalho(s) — Total: ${fmtBRL(entry.total)}`,
          table: {
            columns: [
              { header: "OS", dataKey: "orderNumber", width: 14, align: "center" as const },
              { header: "Código", dataKey: "code", width: 22 },
              { header: "Paciente", dataKey: "patientName", width: 40 },
              { header: "Serviço", dataKey: "serviceName" },
              { header: "Prazo", dataKey: "deadline", width: 22, align: "center" as const },
              { header: "Valor", dataKey: "price", width: 26, align: "right" as const },
            ],
            rows: entry.rows.map(r => ({
              orderNumber: r.orderNumber ?? "—",
              code: r.code,
              patientName: r.patientName ?? "—",
              serviceName: r.serviceName,
              deadline: fmtDate(r.deadline),
              price: fmtBRL(r.price),
            })),
            summary: [{ label: "Subtotal:", value: fmtBRL(entry.total) }],
          },
        });
      }

      // Resumo geral
      sections.push({
        title: "Resumo Geral",
        table: {
          columns: [
            { header: "Cliente", dataKey: "client" },
            { header: "Qtd. Trabalhos", dataKey: "count", width: 30, align: "center" as const },
            { header: "Total", dataKey: "total", width: 35, align: "right" as const },
          ],
          rows: Array.from(byClient.values()).map(e => ({
            client: e.clientName,
            count: String(e.rows.length),
            total: fmtBRL(e.total),
          })),
          summary: [{ label: "TOTAL GERAL:", value: fmtBRL(grandTotal) }],
        },
      });

      const pdfBuffer = buildPdfDocument({
        title: "Fechamento Mensal",
        subtitle: input.clientId ? byClient.values().next().value?.clientName : "Todos os Clientes",
        period,
        sections,
        lab,
      });

      return { base64: pdfBuffer.toString("base64"), filename: `fechamento-${input.year}-${String(input.month).padStart(2, "0")}.pdf` };
    }),

  // ─── Relatório 2: Trabalhos por Período ──────────────────

  generateJobsPeriod: adminProcedure
    .input(z.object({
      year: z.number().int().min(2020).max(2100),
      month: z.number().int().min(1).max(12).optional(),
      quarter: z.number().int().min(1).max(4).optional(),
      clientId: z.number().int().optional(),
      status: z.string().optional(),
      serviceType: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const lab = await getLabSettings();
      const { start, end } = periodRange(input.year, input.month, input.quarter);
      const period = periodLabel(input.year, input.month, input.quarter);

      const conditions: any[] = [gte(jobs.createdAt, start), lte(jobs.createdAt, end)];
      if (input.clientId) conditions.push(eq(jobs.clientId, input.clientId));
      if (input.status) conditions.push(eq(jobs.status, input.status as any));

      const jobRows = await db
        .select({
          id: jobs.id,
          code: jobs.code,
          orderNumber: jobs.orderNumber,
          clientName: clients.name,
          serviceName: jobs.serviceName,
          patientName: jobs.patientName,
          price: jobs.price,
          status: jobs.status,
          deadline: jobs.deadline,
          createdAt: jobs.createdAt,
          assignedToName: users.name,
        })
        .from(jobs)
        .leftJoin(clients, eq(jobs.clientId, clients.id))
        .leftJoin(users, eq(jobs.assignedTo, users.id))
        .where(and(...conditions))
        .orderBy(desc(jobs.createdAt));

      const total = jobRows.reduce((s, r) => s + parseFloat(String(r.price ?? "0")), 0);
      const delivered = jobRows.filter(r => r.status === "delivered").length;
      const pending = jobRows.filter(r => !["delivered", "overdue"].includes(r.status)).length;
      const overdue = jobRows.filter(r => r.status === "overdue").length;

      // Status breakdown
      const statusBreakdown = new Map<string, { count: number; total: number }>();
      for (const r of jobRows) {
        const s = fmtStatus(r.status);
        if (!statusBreakdown.has(s)) statusBreakdown.set(s, { count: 0, total: 0 });
        const e = statusBreakdown.get(s)!;
        e.count++;
        e.total += parseFloat(String(r.price ?? "0"));
      }

      const pdfBuffer = buildPdfDocument({
        title: "Relatório de Trabalhos",
        subtitle: input.clientId ? undefined : "Todos os Clientes",
        period,
        sections: [
          {
            kpis: [
              { label: "Total de Trabalhos", value: String(jobRows.length) },
              { label: "Entregues", value: String(delivered), sub: `${jobRows.length > 0 ? Math.round(delivered / jobRows.length * 100) : 0}%` },
              { label: "Em Andamento", value: String(pending) },
              { label: "Atrasados", value: String(overdue) },
              { label: "Faturamento", value: fmtBRL(total) },
            ],
          },
          { spacer: 4 },
          {
            title: "Lista de Trabalhos",
            table: {
              columns: [
                { header: "OS", dataKey: "orderNumber", width: 14, align: "center" as const },
                { header: "Código", dataKey: "code", width: 22 },
                { header: "Cliente", dataKey: "clientName", width: 35 },
                { header: "Paciente", dataKey: "patientName", width: 35 },
                { header: "Serviço", dataKey: "serviceName" },
                { header: "Status", dataKey: "status", width: 22 },
                { header: "Prazo", dataKey: "deadline", width: 22, align: "center" as const },
                { header: "Valor", dataKey: "price", width: 26, align: "right" as const },
              ],
              rows: jobRows.map(r => ({
                orderNumber: r.orderNumber ?? "—",
                code: r.code,
                clientName: r.clientName ?? "—",
                patientName: r.patientName ?? "—",
                serviceName: r.serviceName,
                status: fmtStatus(r.status),
                deadline: fmtDate(r.deadline),
                price: fmtBRL(r.price),
              })),
              summary: [{ label: "TOTAL:", value: fmtBRL(total) }],
            },
          },
          { spacer: 4 },
          {
            title: "Distribuição por Status",
            table: {
              columns: [
                { header: "Status", dataKey: "status" },
                { header: "Quantidade", dataKey: "count", width: 30, align: "center" as const },
                { header: "Total", dataKey: "total", width: 35, align: "right" as const },
              ],
              rows: Array.from(statusBreakdown.entries()).map(([s, v]) => ({
                status: s,
                count: String(v.count),
                total: fmtBRL(v.total),
              })),
            },
          },
        ],
        lab,
      });

      return { base64: pdfBuffer.toString("base64"), filename: `trabalhos-${period.replace("/", "-")}.pdf` };
    }),

  // ─── Relatório 3: Produtividade por Técnico ──────────────

  generateProductivity: adminProcedure
    .input(z.object({
      year: z.number().int().min(2020).max(2100),
      month: z.number().int().min(1).max(12).optional(),
      quarter: z.number().int().min(1).max(4).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const lab = await getLabSettings();
      const { start, end } = periodRange(input.year, input.month, input.quarter);
      const period = periodLabel(input.year, input.month, input.quarter);

      const jobRows = await db
        .select({
          id: jobs.id,
          assignedTo: jobs.assignedTo,
          techName: users.name,
          status: jobs.status,
          price: jobs.price,
          createdAt: jobs.createdAt,
          deadline: jobs.deadline,
        })
        .from(jobs)
        .leftJoin(users, eq(jobs.assignedTo, users.id))
        .where(and(gte(jobs.createdAt, start), lte(jobs.createdAt, end)));

      // Agrupar por técnico
      const byTech = new Map<string, {
        name: string;
        total: number;
        delivered: number;
        overdue: number;
        revenue: number;
      }>();

      for (const r of jobRows) {
        const key = r.techName ?? "Não Atribuído";
        if (!byTech.has(key)) byTech.set(key, { name: key, total: 0, delivered: 0, overdue: 0, revenue: 0 });
        const e = byTech.get(key)!;
        e.total++;
        if (r.status === "delivered") { e.delivered++; e.revenue += parseFloat(String(r.price ?? "0")); }
        if (r.status === "overdue") e.overdue++;
      }

      const techRows = Array.from(byTech.values()).sort((a, b) => b.delivered - a.delivered);

      const pdfBuffer = buildPdfDocument({
        title: "Produtividade por Técnico",
        period,
        sections: [
          {
            kpis: [
              { label: "Técnicos Ativos", value: String(byTech.size) },
              { label: "Total de Trabalhos", value: String(jobRows.length) },
              { label: "Entregues", value: String(jobRows.filter(r => r.status === "delivered").length) },
              { label: "Receita Total", value: fmtBRL(techRows.reduce((s, r) => s + r.revenue, 0)) },
            ],
          },
          { spacer: 4 },
          {
            title: "Desempenho por Técnico",
            table: {
              columns: [
                { header: "Técnico", dataKey: "name" },
                { header: "Total", dataKey: "total", width: 22, align: "center" as const },
                { header: "Entregues", dataKey: "delivered", width: 26, align: "center" as const },
                { header: "Atrasados", dataKey: "overdue", width: 26, align: "center" as const },
                { header: "Taxa Entrega", dataKey: "rate", width: 28, align: "center" as const },
                { header: "Receita Gerada", dataKey: "revenue", width: 36, align: "right" as const },
              ],
              rows: techRows.map(r => ({
                name: r.name,
                total: String(r.total),
                delivered: String(r.delivered),
                overdue: String(r.overdue),
                rate: r.total > 0 ? `${Math.round(r.delivered / r.total * 100)}%` : "0%",
                revenue: fmtBRL(r.revenue),
              })),
            },
          },
        ],
        lab,
      });

      return { base64: pdfBuffer.toString("base64"), filename: `produtividade-${period.replace("/", "-")}.pdf` };
    }),

  // ─── Relatório 4: Trimestral / Anual ─────────────────────

  generateQuarterlyAnnual: adminProcedure
    .input(z.object({
      year: z.number().int().min(2020).max(2100),
      quarter: z.number().int().min(1).max(4).optional(), // null = anual
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const lab = await getLabSettings();
      const { start, end } = periodRange(input.year, undefined, input.quarter);
      const period = periodLabel(input.year, undefined, input.quarter);
      const isAnnual = !input.quarter;

      const jobRows = await db
        .select({
          id: jobs.id,
          clientId: jobs.clientId,
          clientName: clients.name,
          serviceName: jobs.serviceName,
          price: jobs.price,
          status: jobs.status,
          createdAt: jobs.createdAt,
        })
        .from(jobs)
        .leftJoin(clients, eq(jobs.clientId, clients.id))
        .where(and(gte(jobs.createdAt, start), lte(jobs.createdAt, end)));

      const arRows = await db
        .select()
        .from(accountsReceivable)
        .where(and(gte(accountsReceivable.dueDate, start), lte(accountsReceivable.dueDate, end)));

      const totalRevenue = jobRows.filter(r => r.status === "delivered").reduce((s, r) => s + parseFloat(String(r.price ?? "0")), 0);
      const totalReceived = arRows.filter((r: any) => r.status === "paid").reduce((s: number, r: any) => s + parseFloat(String(r.amount ?? "0")), 0);
      const totalPending = arRows.filter((r: any) => r.status !== "paid" && r.status !== "cancelled").reduce((s: number, r: any) => s + parseFloat(String(r.amount ?? "0")), 0);

      // Top clientes
      const byClient = new Map<string, { count: number; revenue: number }>();
      for (const r of jobRows) {
        const k = r.clientName ?? "Sem Cliente";
        if (!byClient.has(k)) byClient.set(k, { count: 0, revenue: 0 });
        const e = byClient.get(k)!;
        e.count++;
        if (r.status === "delivered") e.revenue += parseFloat(String(r.price ?? "0"));
      }
      const topClients = Array.from(byClient.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 10);

      // Evolução mensal (para relatório anual)
      const monthlyData: { label: string; count: number; revenue: number }[] = [];
      if (isAnnual) {
        for (let m = 1; m <= 12; m++) {
          const { start: ms, end: me } = periodRange(input.year, m);
          const monthJobs = jobRows.filter(r => {
            const d = new Date(r.createdAt);
            return d >= ms && d <= me;
          });
          const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
          monthlyData.push({
            label: months[m - 1],
            count: monthJobs.length,
            revenue: monthJobs.filter(r => r.status === "delivered").reduce((s, r) => s + parseFloat(String(r.price ?? "0")), 0),
          });
        }
      }

      const sections: any[] = [
        {
          kpis: [
            { label: "Total de Trabalhos", value: String(jobRows.length) },
            { label: "Entregues", value: String(jobRows.filter(r => r.status === "delivered").length) },
            { label: "Faturamento", value: fmtBRL(totalRevenue) },
            { label: "Recebido", value: fmtBRL(totalReceived) },
            { label: "A Receber", value: fmtBRL(totalPending) },
          ],
        },
        { spacer: 4 },
        {
          title: "Top 10 Clientes por Receita",
          table: {
            columns: [
              { header: "#", dataKey: "rank", width: 12, align: "center" as const },
              { header: "Cliente", dataKey: "client" },
              { header: "Trabalhos", dataKey: "count", width: 28, align: "center" as const },
              { header: "Receita", dataKey: "revenue", width: 36, align: "right" as const },
            ],
            rows: topClients.map(([name, v], i) => ({
              rank: String(i + 1),
              client: name,
              count: String(v.count),
              revenue: fmtBRL(v.revenue),
            })),
          },
        },
      ];

      if (isAnnual && monthlyData.length > 0) {
        sections.push({ spacer: 4 });
        sections.push({
          title: "Evolução Mensal",
          table: {
            columns: [
              { header: "Mês", dataKey: "label", width: 20 },
              { header: "Trabalhos", dataKey: "count", width: 28, align: "center" as const },
              { header: "Receita", dataKey: "revenue", width: 36, align: "right" as const },
            ],
            rows: monthlyData.map(m => ({
              label: m.label,
              count: String(m.count),
              revenue: fmtBRL(m.revenue),
            })),
            summary: [{ label: "TOTAL ANUAL:", value: fmtBRL(totalRevenue) }],
          },
        });
      }

      const pdfBuffer = buildPdfDocument({
        title: isAnnual ? "Relatório Anual" : "Relatório Trimestral",
        period,
        sections,
        lab,
      });

      return {
        base64: pdfBuffer.toString("base64"),
        filename: isAnnual ? `relatorio-anual-${input.year}.pdf` : `relatorio-trimestral-${input.year}-Q${input.quarter}.pdf`,
      };
    }),

  // ─── Relatório 5: Estoque ─────────────────────────────────

  generateStockReport: adminProcedure
    .input(z.object({
      year: z.number().int().min(2020).max(2100),
      month: z.number().int().min(1).max(12).optional(),
      includeMovements: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const lab = await getLabSettings();
      const period = input.month ? periodLabel(input.year, input.month) : String(input.year);

      // Materiais com saldo atual
      const materialRows = await db
        .select({
          id: materials.id,
          name: materials.name,
          unit: materials.unit,
          currentStock: materials.currentStock,
          minStock: materials.minStock,
          maxStock: materials.maxStock,
          costPrice: materials.costPrice,
          categoryName: materialCategories.name,
          isActive: materials.isActive,
        })
        .from(materials)
        .leftJoin(materialCategories, eq(materials.categoryId, materialCategories.id))
        .where(eq(materials.isActive, true))
        .orderBy(materialCategories.name, materials.name);

      const totalValue = materialRows.reduce((s, r) =>
        s + parseFloat(String(r.currentStock ?? "0")) * parseFloat(String(r.costPrice ?? "0")), 0);
      const lowStock = materialRows.filter(r =>
        parseFloat(String(r.currentStock ?? "0")) <= parseFloat(String(r.minStock ?? "0")));

      // Movimentações do período (se solicitado)
      let movRows: any[] = [];
      if (input.includeMovements) {
        const { start, end } = periodRange(input.year, input.month);
        movRows = await db
          .select({
            id: stockMovements.id,
            materialName: materials.name,
            type: stockMovements.type,
            quantity: stockMovements.quantity,
            stockAfter: stockMovements.stockAfter,
            reason: stockMovements.reason,
            unitCost: stockMovements.unitCost,
            createdAt: stockMovements.createdAt,
            createdByName: users.name,
          })
          .from(stockMovements)
          .leftJoin(materials, eq(stockMovements.materialId, materials.id))
          .leftJoin(users, eq(stockMovements.createdBy, users.id))
          .where(and(gte(stockMovements.createdAt, start), lte(stockMovements.createdAt, end)))
          .orderBy(desc(stockMovements.createdAt))
          .limit(200);
      }

      const sections: any[] = [
        {
          kpis: [
            { label: "Total de Materiais", value: String(materialRows.length) },
            { label: "Valor em Estoque", value: fmtBRL(totalValue) },
            { label: "Alertas de Reposição", value: String(lowStock.length), sub: lowStock.length > 0 ? "Atenção!" : "OK" },
            { label: "Movimentações", value: String(movRows.length) },
          ],
        },
        { spacer: 4 },
        {
          title: "Saldo de Materiais",
          table: {
            columns: [
              { header: "Categoria", dataKey: "category", width: 28 },
              { header: "Material", dataKey: "name" },
              { header: "Unidade", dataKey: "unit", width: 18, align: "center" as const },
              { header: "Saldo Atual", dataKey: "current", width: 26, align: "right" as const },
              { header: "Mínimo", dataKey: "min", width: 22, align: "right" as const },
              { header: "Custo Unit.", dataKey: "cost", width: 26, align: "right" as const },
              { header: "Valor Total", dataKey: "value", width: 28, align: "right" as const },
              { header: "Status", dataKey: "status", width: 22, align: "center" as const },
            ],
            rows: materialRows.map(r => {
              const current = parseFloat(String(r.currentStock ?? "0"));
              const min = parseFloat(String(r.minStock ?? "0"));
              const cost = parseFloat(String(r.costPrice ?? "0"));
              return {
                category: r.categoryName ?? "—",
                name: r.name,
                unit: r.unit,
                current: current.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
                min: min.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
                cost: fmtBRL(cost),
                value: fmtBRL(current * cost),
                status: current <= min ? "⚠ Baixo" : "OK",
              };
            }),
            summary: [{ label: "VALOR TOTAL EM ESTOQUE:", value: fmtBRL(totalValue) }],
          },
        },
      ];

      if (lowStock.length > 0) {
        sections.push({ spacer: 4 });
        sections.push({
          title: "Materiais Abaixo do Mínimo",
          subtitle: "Reposição necessária",
          table: {
            columns: [
              { header: "Material", dataKey: "name" },
              { header: "Saldo Atual", dataKey: "current", width: 28, align: "right" as const },
              { header: "Mínimo", dataKey: "min", width: 22, align: "right" as const },
              { header: "Déficit", dataKey: "deficit", width: 22, align: "right" as const },
            ],
            rows: lowStock.map(r => {
              const current = parseFloat(String(r.currentStock ?? "0"));
              const min = parseFloat(String(r.minStock ?? "0"));
              return {
                name: r.name,
                current: `${current.toFixed(2)} ${r.unit}`,
                min: `${min.toFixed(2)} ${r.unit}`,
                deficit: `${(min - current).toFixed(2)} ${r.unit}`,
              };
            }),
          },
        });
      }

      if (input.includeMovements && movRows.length > 0) {
        sections.push({ spacer: 4 });
        sections.push({
          title: `Movimentações do Período (${movRows.length})`,
          table: {
            columns: [
              { header: "Data", dataKey: "date", width: 24 },
              { header: "Material", dataKey: "material" },
              { header: "Tipo", dataKey: "type", width: 22, align: "center" as const },
              { header: "Qtd.", dataKey: "qty", width: 20, align: "right" as const },
              { header: "Saldo Após", dataKey: "after", width: 24, align: "right" as const },
              { header: "Motivo", dataKey: "reason" },
              { header: "Usuário", dataKey: "user", width: 28 },
            ],
            rows: movRows.map(r => ({
              date: fmtDate(r.createdAt),
              material: r.materialName ?? "—",
              type: fmtStatus(r.type),
              qty: parseFloat(String(r.quantity ?? "0")).toFixed(2),
              after: parseFloat(String(r.stockAfter ?? "0")).toFixed(2),
              reason: r.reason ?? "—",
              user: r.createdByName ?? "—",
            })),
          },
        });
      }

      const pdfBuffer = buildPdfDocument({
        title: "Relatório de Estoque",
        period,
        sections,
        lab,
      });

      return {
        base64: pdfBuffer.toString("base64"),
        filename: `estoque-${period.replace("/", "-")}.pdf`,
      };
    }),

  // ─── Enviar Fechamento Mensal por E-mail ────────────────

  sendMonthlyClosingEmail: adminProcedure
    .input(z.object({
      year: z.number().int().min(2020).max(2100),
      month: z.number().int().min(1).max(12),
      clientId: z.number().int().positive().optional(),
      toEmail: z.string().email("E-mail do destinatário inválido"),
      customMessage: z.string().max(500).optional(),
    }))
    .mutation(async ({ input }) => {
      if (!isEmailConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "SMTP não configurado. Defina SMTP_HOST, SMTP_USER e SMTP_PASS nas variáveis de ambiente.",
        });
      }

      const lab = await getLabSettings();
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const { start, end } = periodRange(input.year, input.month);
      const period = periodLabel(input.year, input.month);

      // Buscar trabalhos entregues no período
      const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
        "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

      let jobQuery = db
        .select({
          id: jobs.id,
          code: jobs.code,
          clientId: jobs.clientId,
          clientName: clients.name,
          serviceName: jobs.serviceName,
          price: jobs.price,
          deliveredAt: jobs.deliveredAt,
          patientName: jobs.patientName,
          orderNumber: jobs.orderNumber,
        })
        .from(jobs)
        .leftJoin(clients, eq(jobs.clientId, clients.id))
        .where(
          and(
            eq(jobs.status, "delivered"),
            gte(jobs.deliveredAt, start),
            lte(jobs.deliveredAt, end),
            ...(input.clientId ? [eq(jobs.clientId, input.clientId)] : []),
          )
        )
        .orderBy(desc(jobs.deliveredAt));

      const jobRows = await jobQuery;

      // Calcular total
      const totalAmount = jobRows.reduce((sum, j) => sum + parseFloat(String(j.price ?? "0")), 0);
      const clientName = input.clientId
        ? (jobRows[0]?.clientName ?? "Cliente")
        : "Todos os Clientes";

      // Gerar PDF
      const sections: any[] = [
        {
          title: `Fechamento — ${period}`,
          table: {
            columns: [
              { header: "OS", dataKey: "os", width: 20 },
              { header: "Código", dataKey: "code", width: 28 },
              { header: "Paciente", dataKey: "patient" },
              { header: "Serviço", dataKey: "service" },
              { header: "Entrega", dataKey: "delivered", width: 24 },
              { header: "Valor (R$)", dataKey: "price", width: 28, align: "right" as const },
            ],
            rows: jobRows.map(j => ({
              os: j.orderNumber ? String(j.orderNumber) : "—",
              code: j.code ?? "—",
              patient: j.patientName ?? "—",
              service: j.serviceName ?? "—",
              delivered: fmtDate(j.deliveredAt),
              price: fmtBRL(parseFloat(String(j.price ?? "0"))),
            })),
            summary: `Total: ${fmtBRL(totalAmount)} | ${jobRows.length} trabalho${jobRows.length !== 1 ? "s" : ""}`,
          },
        },
      ];

      const pdfBuffer = buildPdfDocument({
        title: `Fechamento Mensal — ${period}`,
        period,
        sections,
        lab,
      });

      const pdfBase64 = pdfBuffer.toString("base64");
      const filename = `fechamento-${clientName.replace(/[^a-zA-Z0-9]/g, "-")}-${monthNames[input.month - 1]}-${input.year}.pdf`;

      // Montar e-mail HTML
      const html = buildMonthlyClosingEmailHtml({
        labName: lab.labName ?? "Laboratório de Prótese",
        labEmail: lab.email,
        labPhone: lab.phone,
        clientName,
        month: input.month,
        year: input.year,
        totalAmount,
        jobCount: jobRows.length,
        customMessage: input.customMessage,
        primaryColor: lab.primaryColor ?? "#1a56db",
      });

      const result = await sendEmail({
        to: input.toEmail,
        subject: `Fechamento Mensal ${period} — ${lab.labName ?? "ProteticFlow"}`,
        html,
        text: `Fechamento Mensal ${period}\nCliente: ${clientName}\nTotal: ${fmtBRL(totalAmount)}\nTrabalhos: ${jobRows.length}`,
        attachments: [{
          filename,
          content: pdfBase64,
          contentType: "application/pdf",
          encoding: "base64",
        }],
      });

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Falha ao enviar e-mail.",
        });
      }

      return {
        success: true,
        messageId: result.messageId,
        filename,
        jobCount: jobRows.length,
        totalAmount,
      };
    }),

  // ─── Verificar se SMTP está configurado ─────────────────

  checkEmailConfig: protectedProcedure.query(() => {
    return { configured: isEmailConfigured() };
  }),
});
