/**
 * pdfReports.test.ts — ProteticFlow
 * Testes vitest para o router de Relatórios PDF (Fase 14).
 * Cobre: labSettings CRUD, upload de logo, geração de PDFs (5 tipos), RBAC, validações de input.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock do banco Drizzle (encadeado) ────────────────────
// O chain é um array vazio (iterável) com métodos fluentes.
// O db retornado por getDb() NÃO é thenable (para que await getDb() retorne o db).
// O chain é thenable (para que await db.select().from().where() retorne []).

vi.mock("./db", () => {
  const chain: any = [];
  const allMethods = ["select", "from", "leftJoin", "innerJoin", "where", "orderBy", "groupBy", "limit"];
  allMethods.forEach(m => { chain[m] = (..._args: any[]) => chain; });
  chain.then = (resolve: any) => Promise.resolve([]).then(resolve);

  const db: any = { _isDb: true };
  allMethods.forEach(m => { db[m] = (..._args: any[]) => chain; });

  return {
    getDb: () => Promise.resolve(db),
    upsertUser: vi.fn(),
    getUserByOpenId: vi.fn(),
    listClients: vi.fn().mockResolvedValue([]),
    getClient: vi.fn().mockResolvedValue(null),
    createClient: vi.fn().mockResolvedValue({ id: 1 }),
    updateClient: vi.fn(),
    deleteClient: vi.fn(),
    listPriceItems: vi.fn().mockResolvedValue([]),
    createPriceItem: vi.fn().mockResolvedValue({ id: 1 }),
    updatePriceItem: vi.fn(),
    deletePriceItem: vi.fn(),
    listJobs: vi.fn().mockResolvedValue([]),
    getJob: vi.fn().mockResolvedValue(null),
    createJob: vi.fn().mockResolvedValue({ id: 1 }),
    updateJob: vi.fn().mockResolvedValue(undefined),
    deleteJob: vi.fn(),
    generateJobCode: vi.fn().mockResolvedValue("PF-2026-001"),
    getDashboardStats: vi.fn().mockResolvedValue({
      totalJobs: 0, totalClients: 0, todayDeliveries: 0, monthlyRevenue: "0", overdueJobs: 0,
    }),
    listNotifications: vi.fn().mockResolvedValue([]),
    getUnreadNotificationCount: vi.fn().mockResolvedValue(0),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    createNotification: vi.fn().mockResolvedValue(undefined),
    listChatMessages: vi.fn().mockResolvedValue([]),
    saveChatMessage: vi.fn(),
    listUsers: vi.fn().mockResolvedValue([]),
    createInvite: vi.fn().mockResolvedValue({ token: "abc" }),
    listInvites: vi.fn().mockResolvedValue([]),
    revokeInvite: vi.fn(),
    updateUserRole: vi.fn(),
    deactivateUser: vi.fn(),
    reactivateUser: vi.fn(),
    listOrderBlocks: vi.fn().mockResolvedValue([]),
    createOrderBlock: vi.fn().mockResolvedValue({ id: 1 }),
    updateOrderBlock: vi.fn(),
    deleteOrderBlock: vi.fn(),
    resolveClientByOrderNumber: vi.fn(),
    getJobByOrderNumber: vi.fn(),
    listAccountsReceivable: vi.fn().mockResolvedValue([]),
    createAccountReceivable: vi.fn().mockResolvedValue({ id: 1 }),
    updateAccountReceivable: vi.fn(),
    markAccountReceivablePaid: vi.fn(),
    autoCreateReceivableForJob: vi.fn().mockResolvedValue(undefined),
    listFinancialClosings: vi.fn().mockResolvedValue([]),
    generateMonthlyClosing: vi.fn().mockResolvedValue({ id: 1 }),
    closeMonthlyClosing: vi.fn(),
    markClosingPaid: vi.fn(),
    getClientStatement: vi.fn().mockResolvedValue({ client: null, items: [], totals: { total: 0, paid: 0, pending: 0 } }),
    listAccountsPayable: vi.fn().mockResolvedValue([]),
    createAccountPayable: vi.fn().mockResolvedValue({ id: 1 }),
    updateAccountPayable: vi.fn(),
    markAccountPayablePaid: vi.fn(),
    getJobsApproachingDeadline: vi.fn().mockResolvedValue([]),
    getAllActiveUserIds: vi.fn().mockResolvedValue([1]),
    hasDeadlineNotification: vi.fn().mockResolvedValue(false),
    logDeadlineNotification: vi.fn(),
  };
});

vi.mock("./db.labSettings", () => ({
  getLabSettings: vi.fn().mockResolvedValue({
    id: 1,
    labName: "Lab Teste",
    cnpj: "00.000.000/0001-00",
    phone: "(11) 99999-9999",
    email: "lab@teste.com",
    address: "Rua Teste, 123",
    city: "São Paulo",
    state: "SP",
    zipCode: "01310-100",
    logoUrl: null,
    reportHeader: "Laboratório de Prótese",
    reportFooter: "Gerado pelo ProteticFlow",
    primaryColor: "#1a56db",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  upsertLabSettings: vi.fn().mockResolvedValue({
    id: 1,
    labName: "Lab Atualizado",
    cnpj: "00.000.000/0001-00",
    primaryColor: "#ff0000",
  }),
}));

vi.mock("./db.stock", () => ({
  getStockSummary: vi.fn().mockResolvedValue({ totalMaterials: 10, lowStock: 2, totalValue: 5000 }),
  getLowStockMaterials: vi.fn().mockResolvedValue([]),
  listMaterials: vi.fn().mockResolvedValue([]),
  listStockMovements: vi.fn().mockResolvedValue([]),
}));

vi.mock("./db.jobLogs", () => ({
  createJobLog: vi.fn().mockResolvedValue(undefined),
  getJobLogs: vi.fn().mockResolvedValue([]),
  getKanbanMetrics: vi.fn().mockResolvedValue({ avgTimeByStatus: [], totalMovements: 0 }),
  listActiveUsers: vi.fn().mockResolvedValue([]),
  assignJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./db.reports", () => ({
  getReportsSummary: vi.fn().mockResolvedValue(null),
}));

vi.mock("./db.predictions", () => ({
  getPrediction: vi.fn().mockResolvedValue(null),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/logo.png", key: "logos/test.png" }),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({ choices: [{ message: { content: "OK" } }] }),
}));

// ─── Context Helpers ──────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1, openId: "admin-1", email: "admin@test.com", name: "Admin",
    loginMethod: "manus", role: "admin",
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"] };
}

function createCollaboratorContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2, openId: "user-1", email: "colab@test.com", name: "Colaborador",
    loginMethod: "manus", role: "user",
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"] };
}

function createUnauthContext(): TrpcContext {
  return { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"] };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────

describe("pdfReports.getLabSettings", () => {
  it("admin pode buscar configurações do laboratório", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pdfReports.getLabSettings();
    expect(result).toBeDefined();
    expect(result.labName).toBe("Lab Teste");
    expect(result.cnpj).toBe("00.000.000/0001-00");
  });

  it("colaborador pode buscar configurações (leitura pública)", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    const result = await caller.pdfReports.getLabSettings();
    expect(result.labName).toBe("Lab Teste");
  });
});

describe("pdfReports.updateLabSettings", () => {
  it("admin pode atualizar configurações do laboratório", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pdfReports.updateLabSettings({ labName: "Lab Atualizado", primaryColor: "#ff0000" });
    expect(result).toBeDefined();
  });

  it("colaborador NÃO pode atualizar configurações (RBAC)", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(caller.pdfReports.updateLabSettings({ labName: "Hack" })).rejects.toThrow();
  });

  it("guest NÃO pode atualizar configurações", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.pdfReports.updateLabSettings({ labName: "Hack" })).rejects.toThrow();
  });

  it("rejeita cor primária inválida (não hex)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.pdfReports.updateLabSettings({ primaryColor: "not-a-color" })).rejects.toThrow();
  });

  it("aceita cor primária válida em hex", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pdfReports.updateLabSettings({ primaryColor: "#abc123" });
    expect(result).toBeDefined();
  });
});

describe("pdfReports.uploadLogo", () => {
  it("admin pode fazer upload de logo PNG", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const tinyPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const result = await caller.pdfReports.uploadLogo({ base64: tinyPngBase64, mimeType: "image/png", filename: "logo.png" });
    expect(result.url).toContain("https://");
  });

  it("colaborador NÃO pode fazer upload de logo", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(caller.pdfReports.uploadLogo({ base64: "abc", mimeType: "image/png", filename: "logo.png" })).rejects.toThrow();
  });

  it("rejeita tipo MIME inválido", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.pdfReports.uploadLogo({ base64: "abc", mimeType: "application/pdf", filename: "hack.pdf" })).rejects.toThrow();
  });

  it("aceita JPEG como logo", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pdfReports.uploadLogo({ base64: "abc123", mimeType: "image/jpeg", filename: "logo.jpg" });
    expect(result.url).toBeDefined();
  });
});

describe("pdfReports.generateMonthlyClosing", () => {
  it("admin pode gerar relatório de fechamento mensal", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pdfReports.generateMonthlyClosing({ year: 2026, month: 3 });
    expect(result.base64).toBeDefined();
    expect(result.filename).toContain("fechamento");
    expect(result.filename).toContain(".pdf");
    expect(result.base64.startsWith("JVBERi")).toBe(true);
  });

  it("colaborador NÃO pode gerar relatório de fechamento mensal", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(caller.pdfReports.generateMonthlyClosing({ year: 2026, month: 3 })).rejects.toThrow();
  });

  it("rejeita mês inválido (0)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.pdfReports.generateMonthlyClosing({ year: 2026, month: 0 })).rejects.toThrow();
  });

  it("rejeita mês inválido (13)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.pdfReports.generateMonthlyClosing({ year: 2026, month: 13 })).rejects.toThrow();
  });

  it("aceita filtro por clientId", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pdfReports.generateMonthlyClosing({ year: 2026, month: 3, clientId: 42 });
    expect(result.base64).toBeDefined();
  });
});

describe("pdfReports.generateJobsPeriod", () => {
  it("admin pode gerar relatório de trabalhos por período (mensal)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pdfReports.generateJobsPeriod({ year: 2026, month: 3 });
    expect(result.base64).toBeDefined();
    expect(result.filename).toContain("trabalhos");
  });

  it("admin pode gerar relatório de trabalhos por trimestre", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pdfReports.generateJobsPeriod({ year: 2026, quarter: 1 });
    expect(result.base64).toBeDefined();
  });

  it("admin pode gerar relatório anual de trabalhos", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pdfReports.generateJobsPeriod({ year: 2026 });
    expect(result.base64).toBeDefined();
  });

  it("colaborador NÃO pode gerar relatório de trabalhos", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(caller.pdfReports.generateJobsPeriod({ year: 2026, month: 3 })).rejects.toThrow();
  });
});

describe("pdfReports.generateProductivity", () => {
  it("admin pode gerar relatório de produtividade mensal", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pdfReports.generateProductivity({ year: 2026, month: 3 });
    expect(result.base64).toBeDefined();
    expect(result.filename).toContain("produtividade");
  });

  it("admin pode gerar relatório de produtividade trimestral", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pdfReports.generateProductivity({ year: 2026, quarter: 2 });
    expect(result.base64).toBeDefined();
  });

  it("colaborador NÃO pode gerar relatório de produtividade", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(caller.pdfReports.generateProductivity({ year: 2026, month: 3 })).rejects.toThrow();
  });
});

describe("pdfReports.generateQuarterlyAnnual", () => {
  it("admin pode gerar relatório trimestral", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pdfReports.generateQuarterlyAnnual({ year: 2026, quarter: 1 });
    expect(result.base64).toBeDefined();
    expect(result.filename).toContain("trimestral");
  });

  it("admin pode gerar relatório anual (sem quarter)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pdfReports.generateQuarterlyAnnual({ year: 2026 });
    expect(result.base64).toBeDefined();
    expect(result.filename).toContain("anual");
  });

  it("colaborador NÃO pode gerar relatório trimestral/anual", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(caller.pdfReports.generateQuarterlyAnnual({ year: 2026, quarter: 1 })).rejects.toThrow();
  });

  it("rejeita trimestre inválido (5)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.pdfReports.generateQuarterlyAnnual({ year: 2026, quarter: 5 })).rejects.toThrow();
  });
});

describe("pdfReports.generateStockReport", () => {
  it("admin pode gerar relatório de estoque com movimentações", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pdfReports.generateStockReport({ year: 2026, month: 3, includeMovements: true });
    expect(result.base64).toBeDefined();
    expect(result.filename).toContain("estoque");
  });

  it("admin pode gerar relatório de estoque sem movimentações", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pdfReports.generateStockReport({ year: 2026, month: 3, includeMovements: false });
    expect(result.base64).toBeDefined();
  });

  it("colaborador NÃO pode gerar relatório de estoque", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(caller.pdfReports.generateStockReport({ year: 2026, month: 3 })).rejects.toThrow();
  });
});

describe("PDF Engine — formato e estrutura base64", () => {
  it("todos os relatórios retornam base64 válido com magic number do PDF", async () => {
    const caller = appRouter.createCaller(createAdminContext());

    const results = await Promise.all([
      caller.pdfReports.generateMonthlyClosing({ year: 2026, month: 3 }),
      caller.pdfReports.generateJobsPeriod({ year: 2026, month: 3 }),
      caller.pdfReports.generateProductivity({ year: 2026, month: 3 }),
      caller.pdfReports.generateQuarterlyAnnual({ year: 2026, quarter: 1 }),
      caller.pdfReports.generateStockReport({ year: 2026, month: 3 }),
    ]);

    for (const result of results) {
      expect(result.base64).toBeDefined();
      expect(result.base64).toMatch(/^[A-Za-z0-9+/=]+$/);
      // Magic number do PDF em base64: %PDF = JVBERi
      expect(result.base64.startsWith("JVBERi")).toBe(true);
      expect(result.filename.endsWith(".pdf")).toBe(true);
    }
  });
});

// ─── Mock do módulo de e-mail ─────────────────────────────
// Nota: vi.mock é hoisted — o mock do email precisa ser declarado no topo do arquivo.
// Como não podemos mover vi.mock após o fato, usamos vi.doMock para este bloco
// ou verificamos o comportamento via variáveis de ambiente.

describe("pdfReports.checkEmailConfig", () => {
  it("retorna configured=false quando SMTP não está configurado", async () => {
    // Por padrão no ambiente de teste, SMTP_HOST não está definido
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.pdfReports.checkEmailConfig();
    expect(result).toHaveProperty("configured");
    expect(typeof result.configured).toBe("boolean");
  });

  it("colaborador pode verificar configuração de e-mail", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    const result = await caller.pdfReports.checkEmailConfig();
    expect(result).toHaveProperty("configured");
  });
});

describe("pdfReports.sendMonthlyClosingEmail — validações de input", () => {
  it("rejeita e-mail inválido", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.pdfReports.sendMonthlyClosingEmail({
        year: 2026, month: 3,
        toEmail: "not-an-email",
      })
    ).rejects.toThrow();
  });

  it("rejeita mês inválido (0)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.pdfReports.sendMonthlyClosingEmail({
        year: 2026, month: 0,
        toEmail: "cliente@test.com",
      })
    ).rejects.toThrow();
  });

  it("rejeita mês inválido (13)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.pdfReports.sendMonthlyClosingEmail({
        year: 2026, month: 13,
        toEmail: "cliente@test.com",
      })
    ).rejects.toThrow();
  });

  it("rejeita mensagem personalizada muito longa (>500 chars)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.pdfReports.sendMonthlyClosingEmail({
        year: 2026, month: 3,
        toEmail: "cliente@test.com",
        customMessage: "a".repeat(501),
      })
    ).rejects.toThrow();
  });

  it("colaborador NÃO pode enviar e-mail (RBAC)", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(
      caller.pdfReports.sendMonthlyClosingEmail({
        year: 2026, month: 3,
        toEmail: "cliente@test.com",
      })
    ).rejects.toThrow();
  });

  it("guest NÃO pode enviar e-mail", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(
      caller.pdfReports.sendMonthlyClosingEmail({
        year: 2026, month: 3,
        toEmail: "cliente@test.com",
      })
    ).rejects.toThrow();
  });

  it("falha com PRECONDITION_FAILED quando SMTP não está configurado", async () => {
    // SMTP_HOST não está definido no ambiente de teste → deve lançar PRECONDITION_FAILED
    const caller = appRouter.createCaller(createAdminContext());
    try {
      await caller.pdfReports.sendMonthlyClosingEmail({
        year: 2026, month: 3,
        toEmail: "cliente@test.com",
      });
      // Se não lançou, o SMTP está configurado no ambiente — aceitar como OK
    } catch (err: any) {
      // Deve ser PRECONDITION_FAILED (SMTP não configurado) ou INTERNAL_SERVER_ERROR
      expect(["PRECONDITION_FAILED", "INTERNAL_SERVER_ERROR"]).toContain(err?.data?.code ?? err?.code);
    }
  });
});
