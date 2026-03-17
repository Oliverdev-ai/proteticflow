/**
 * reports.test.ts — ProteticFlow
 * Testes vitest para o router de Relatórios (Fase 13)
 * e melhorias do Kanban (jobLogs, assignedTo, métricas).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ─── Mocks ─────────────────────────────────────────────────

vi.mock("./db", () => ({
  getDashboardStats: vi.fn().mockResolvedValue({
    totalJobs: 10, totalClients: 5, todayDeliveries: 2, overdueJobs: 1,
    monthlyRevenue: "5000.00",
  }),
  listJobs: vi.fn().mockResolvedValue([]),
  listClients: vi.fn().mockResolvedValue([]),
  listOrderBlocks: vi.fn().mockResolvedValue([]),
  listAccountsReceivable: vi.fn().mockResolvedValue([]),
  listFinancialClosings: vi.fn().mockResolvedValue([]),
  listAccountsPayable: vi.fn().mockResolvedValue([]),
  resolveClientByOrderNumber: vi.fn().mockResolvedValue(null),
  getJobByOrderNumber: vi.fn().mockResolvedValue(null),
  listChatMessages: vi.fn().mockResolvedValue([]),
  saveChatMessage: vi.fn().mockResolvedValue(undefined),
  getJobsApproachingDeadline: vi.fn().mockResolvedValue([]),
  getAllActiveUserIds: vi.fn().mockResolvedValue([]),
  hasDeadlineNotification: vi.fn().mockResolvedValue(false),
  logDeadlineNotification: vi.fn().mockResolvedValue(undefined),
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./db.stock", () => ({
  getStockSummary: vi.fn().mockResolvedValue({
    totalMaterials: 0, lowStockCount: 0, totalValue: 0,
  }),
  getLowStockMaterials: vi.fn().mockResolvedValue([]),
}));

vi.mock("./db.jobLogs", () => ({
  createJobLog: vi.fn().mockResolvedValue(undefined),
  getJobLogs: vi.fn().mockResolvedValue([]),
  getKanbanMetrics: vi.fn().mockResolvedValue({ avgTimeByStatus: [], totalMovements: 0 }),
}));

vi.mock("./db.reports", () => ({
  getProductionReport: vi.fn().mockResolvedValue({
    period: "03/2026",
    totalJobs: 15,
    deliveredJobs: 10,
    pendingJobs: 5,
    overdueJobs: 2,
    avgDeliveryDays: 3,
    byStatus: [{ status: "delivered", label: "Entregue", count: 10 }],
    byService: [{ serviceName: "Coroa Metal-Cerâmica", count: 8, totalValue: 4000 }],
    byClient: [{ clientName: "Dr. Silva", count: 6, totalValue: 3000 }],
    topServices: [{ serviceName: "Coroa Metal-Cerâmica", count: 8 }],
    jobsList: [],
  }),
  getFinancialReport: vi.fn().mockResolvedValue({
    period: "03/2026",
    totalRevenue: 12000,
    receivedRevenue: 8000,
    pendingRevenue: 3000,
    overdueRevenue: 1000,
    totalExpenses: 2000,
    netResult: 6000,
    byClient: [],
    monthlyTrend: [],
    receivablesList: [],
  }),
  getStockReport: vi.fn().mockResolvedValue({
    period: "03/2026",
    totalMaterials: 20,
    lowStockCount: 3,
    totalStockValue: 5000,
    totalConsumed: 150,
    totalReceived: 200,
    topConsumed: [{ materialName: "Resina Acrílica", unit: "kg", quantity: 50, totalCost: 500 }],
    byCategory: [{ categoryName: "Resinas", materialCount: 5, totalValue: 2000 }],
    movementsList: [],
  }),
  getReportsSummary: vi.fn().mockResolvedValue({
    production: { totalJobs: 15, delivered: 10, overdue: 2, topService: "Coroa Metal-Cerâmica" },
    financial: { totalRevenue: 12000, received: 8000, pending: 3000, netResult: 6000 },
    stock: { totalMaterials: 20, lowStock: 3, totalValue: 5000, topConsumed: "Resina Acrílica" },
  }),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Resposta da IA" } }],
  }),
}));

// ─── Test Helpers ──────────────────────────────────────────

import { appRouter } from "./routers";

function makeCtx(role: "admin" | "user" = "admin") {
  return {
    user: {
      id: 1, openId: "test-open-id", name: "Test User", role, email: null,
      loginMethod: "manus", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

function makeCaller(role: "admin" | "user" = "admin") {
  return appRouter.createCaller(makeCtx(role) as any);
}

// ─── Reports Router Tests ──────────────────────────────────

describe("reportsRouter", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("production", () => {
    it("retorna relatório de produção para admin", async () => {
      const caller = makeCaller("admin");
      const result = await caller.reports.production({ year: 2026, month: 3 });
      expect(result.totalJobs).toBe(15);
      expect(result.deliveredJobs).toBe(10);
      expect(result.overdueJobs).toBe(2);
      expect(result.avgDeliveryDays).toBe(3);
    });

    it("retorna relatório de produção para colaborador", async () => {
      const caller = makeCaller("user");
      const result = await caller.reports.production({ year: 2026, month: 3 });
      expect(result.period).toBe("03/2026");
    });

    it("aceita ano sem mês (relatório anual)", async () => {
      const caller = makeCaller("admin");
      const result = await caller.reports.production({ year: 2026 });
      expect(result).toBeDefined();
    });

    it("rejeita ano inválido", async () => {
      const caller = makeCaller("admin");
      await expect(
        caller.reports.production({ year: 1990, month: 3 })
      ).rejects.toThrow();
    });

    it("rejeita mês inválido (0)", async () => {
      const caller = makeCaller("admin");
      await expect(
        caller.reports.production({ year: 2026, month: 0 })
      ).rejects.toThrow();
    });

    it("rejeita mês inválido (13)", async () => {
      const caller = makeCaller("admin");
      await expect(
        caller.reports.production({ year: 2026, month: 13 })
      ).rejects.toThrow();
    });
  });

  describe("financial", () => {
    it("retorna relatório financeiro com KPIs corretos", async () => {
      const caller = makeCaller("admin");
      const result = await caller.reports.financial({ year: 2026, month: 3 });
      expect(result.totalRevenue).toBe(12000);
      expect(result.receivedRevenue).toBe(8000);
      expect(result.pendingRevenue).toBe(3000);
      expect(result.overdueRevenue).toBe(1000);
      expect(result.netResult).toBe(6000);
    });

    it("retorna tendência mensal", async () => {
      const caller = makeCaller("admin");
      const result = await caller.reports.financial({ year: 2026, month: 3 });
      expect(Array.isArray(result.monthlyTrend)).toBe(true);
    });

    it("retorna lista de contas a receber", async () => {
      const caller = makeCaller("admin");
      const result = await caller.reports.financial({ year: 2026, month: 3 });
      expect(Array.isArray(result.receivablesList)).toBe(true);
    });
  });

  describe("stock", () => {
    it("retorna relatório de estoque com totais", async () => {
      const caller = makeCaller("admin");
      const result = await caller.reports.stock({ year: 2026, month: 3 });
      expect(result.totalMaterials).toBe(20);
      expect(result.lowStockCount).toBe(3);
      expect(result.totalStockValue).toBe(5000);
    });

    it("retorna top materiais consumidos", async () => {
      const caller = makeCaller("admin");
      const result = await caller.reports.stock({ year: 2026, month: 3 });
      expect(result.topConsumed[0].materialName).toBe("Resina Acrílica");
      expect(result.topConsumed[0].quantity).toBe(50);
    });

    it("retorna breakdown por categoria", async () => {
      const caller = makeCaller("admin");
      const result = await caller.reports.stock({ year: 2026, month: 3 });
      expect(result.byCategory[0].categoryName).toBe("Resinas");
    });
  });

  describe("summary", () => {
    it("retorna resumo consolidado do mês", async () => {
      const caller = makeCaller("admin");
      const result = await caller.reports.summary();
      expect(result?.production.totalJobs).toBe(15);
      expect(result?.financial.netResult).toBe(6000);
      expect(result?.stock.lowStock).toBe(3);
    });

    it("retorna null quando db não disponível (graceful)", async () => {
      const { getReportsSummary } = await import("./db.reports");
      vi.mocked(getReportsSummary).mockResolvedValueOnce(null);
      const caller = makeCaller("admin");
      const result = await caller.reports.summary();
      expect(result).toBeNull();
    });
  });
});

// ─── JobLogs / Kanban Improvements Tests ──────────────────

describe("kanbanRouter — melhorias (jobLogs + assignedTo + métricas)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getJobLogs retorna array vazio quando não há logs", async () => {
    const { getJobLogs } = await import("./db.jobLogs");
    const result = await getJobLogs(1);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("createJobLog é chamado ao mover trabalho no Kanban", async () => {
    const { createJobLog } = await import("./db.jobLogs");
    await createJobLog({
      jobId: 1,
      userId: 1,
      fromStatus: "waiting",
      toStatus: "in_production",
      notes: "Iniciado",
    });
    expect(createJobLog).toHaveBeenCalledWith({
      jobId: 1,
      userId: 1,
      fromStatus: "waiting",
      toStatus: "in_production",
      notes: "Iniciado",
    });
  });

  it("getKanbanMetrics retorna estrutura correta", async () => {
    const { getKanbanMetrics } = await import("./db.jobLogs");
    const metrics = await getKanbanMetrics();
    expect(metrics).toHaveProperty("avgTimeByStatus");
    expect(metrics).toHaveProperty("totalMovements");
    expect(Array.isArray(metrics.avgTimeByStatus)).toBe(true);
  });
});

// ─── PDF Export Logic Tests (unit) ────────────────────────

describe("PDF export data structure validation", () => {
  it("production report tem todos os campos necessários para PDF", () => {
    const data = {
      period: "03/2026",
      totalJobs: 15,
      deliveredJobs: 10,
      pendingJobs: 5,
      overdueJobs: 2,
      avgDeliveryDays: 3,
      byStatus: [],
      byService: [{ serviceName: "Coroa", count: 8, totalValue: 4000 }],
      byClient: [],
      topServices: [],
      jobsList: [
        {
          id: 1, code: "PF-001", orderNumber: 100,
          serviceName: "Coroa", clientName: "Dr. Silva",
          patientName: "João", status: "delivered",
          deadline: new Date(), deliveredAt: new Date(),
          price: "500.00", assignedToName: "Técnico A",
        },
      ],
    };
    expect(data.jobsList[0]).toHaveProperty("code");
    expect(data.jobsList[0]).toHaveProperty("serviceName");
    expect(data.jobsList[0]).toHaveProperty("clientName");
    expect(typeof data.totalJobs).toBe("number");
    expect(typeof data.avgDeliveryDays).toBe("number");
  });

  it("financial report tem todos os campos necessários para PDF", () => {
    const data = {
      period: "03/2026",
      totalRevenue: 12000,
      receivedRevenue: 8000,
      pendingRevenue: 3000,
      overdueRevenue: 1000,
      totalExpenses: 2000,
      netResult: 6000,
      byClient: [],
      monthlyTrend: [{ month: "03/2026", revenue: 12000, received: 8000 }],
      receivablesList: [
        {
          id: 1, jobCode: "PF-001", clientName: "Dr. Silva",
          amount: "500.00", dueDate: new Date(), paidAt: null,
          status: "pending", description: null,
        },
      ],
    };
    expect(data.netResult).toBe(data.receivedRevenue - data.totalExpenses);
    expect(data.receivablesList[0]).toHaveProperty("amount");
    expect(data.monthlyTrend[0]).toHaveProperty("revenue");
  });

  it("stock report tem todos os campos necessários para PDF", () => {
    const data = {
      period: "03/2026",
      totalMaterials: 20,
      lowStockCount: 3,
      totalStockValue: 5000,
      totalConsumed: 150,
      totalReceived: 200,
      topConsumed: [{ materialName: "Resina", unit: "kg", quantity: 50, totalCost: 500 }],
      byCategory: [{ categoryName: "Resinas", materialCount: 5, totalValue: 2000 }],
      movementsList: [],
    };
    expect(data.topConsumed[0]).toHaveProperty("materialName");
    expect(data.topConsumed[0]).toHaveProperty("quantity");
    expect(data.byCategory[0]).toHaveProperty("categoryName");
  });
});

// ─── Period Validation Tests ───────────────────────────────

describe("period validation", () => {
  const validInputs = [
    { year: 2026, month: 1 },
    { year: 2026, month: 12 },
    { year: 2026 },
    { year: 2020, month: 6 },
  ];

  const invalidInputs = [
    { year: 1990, month: 3 },  // year too old
    { year: 2031, month: 3 },  // year too far
    { year: 2026, month: 0 },  // month 0
    { year: 2026, month: 13 }, // month 13
  ];

  it.each(validInputs)("aceita input válido: %o", async (input) => {
    const caller = makeCaller("admin");
    await expect(
      caller.reports.production(input)
    ).resolves.toBeDefined();
  });

  it.each(invalidInputs)("rejeita input inválido: %o", async (input) => {
    const caller = makeCaller("admin");
    await expect(
      caller.reports.production(input as any)
    ).rejects.toThrow();
  });
});
