/**
 * portal.test.ts — ProteticFlow
 * Testes para o Portal do Cliente: validateToken, getData, generateToken, revokeToken, deleteToken, sendPortalLink
 *
 * Segurança testada:
 * - Token inválido → UNAUTHORIZED
 * - Token expirado → UNAUTHORIZED
 * - Token revogado → UNAUTHORIZED
 * - Colaborador pode listar tokens (listTokens é protectedProcedure)
 * - Somente admin pode gerar, revogar e deletar tokens (adminProcedure)
 * - Acesso público (validateToken, getData) sem autenticação
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock db module ────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({}),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  listClients: vi.fn().mockResolvedValue([]),
  getClient: vi.fn().mockResolvedValue({ id: 1, name: "Dr. Carlos", email: "carlos@test.com" }),
  createClient: vi.fn().mockResolvedValue({ id: 1 }),
  updateClient: vi.fn(),
  deleteClient: vi.fn(),
  listPriceItems: vi.fn().mockResolvedValue([]),
  createPriceItem: vi.fn().mockResolvedValue({ id: 1 }),
  updatePriceItem: vi.fn(),
  deletePriceItem: vi.fn(),
  listJobs: vi.fn().mockResolvedValue([]),
  getJob: vi.fn(),
  createJob: vi.fn().mockResolvedValue({ id: 1 }),
  updateJob: vi.fn().mockResolvedValue(undefined),
  deleteJob: vi.fn(),
  generateJobCode: vi.fn().mockResolvedValue("PF-2026-001"),
  getDashboardStats: vi.fn().mockResolvedValue({ totalJobs: 0, totalClients: 0, todayDeliveries: 0, monthlyRevenue: "0", overdueJobs: 0 }),
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
}));

vi.mock("./db.jobLogs", () => ({
  createJobLog: vi.fn().mockResolvedValue(undefined),
  getJobLogs: vi.fn().mockResolvedValue([]),
  getKanbanMetrics: vi.fn().mockResolvedValue({ avgTimeByStatus: [], totalMovements: 0 }),
  listActiveUsers: vi.fn().mockResolvedValue([]),
  assignJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./db.stock", () => ({
  getStockSummary: vi.fn().mockResolvedValue({ totalMaterials: 0, lowStockCount: 0, totalValue: 0 }),
  getLowStockMaterials: vi.fn().mockResolvedValue([]),
}));

vi.mock("./db.reports", () => ({
  getReportsSummary: vi.fn().mockResolvedValue(null),
}));

vi.mock("./db.predictions", () => ({
  getPrediction: vi.fn().mockResolvedValue(null),
}));

vi.mock("./db.labSettings", () => ({
  getLabSettings: vi.fn().mockResolvedValue({
    labName: "Lab Teste",
    logoUrl: null,
    primaryColor: "#1a56db",
    email: "lab@teste.com",
    phone: "(11) 99999-9999",
  }),
}));

// ─── Mock db.portal ────────────────────────────────────────
const mockValidToken = {
  id: 1,
  clientId: 1,
  token: "abc123valid",
  label: "Acesso padrão",
  isActive: true,
  expiresAt: new Date(Date.now() + 30 * 86400000), // 30 days from now
  lastAccessAt: null,
  accessCount: 5,
  createdAt: new Date(),
};

const mockExpiredToken = {
  ...mockValidToken,
  id: 2,
  token: "expiredtoken",
  expiresAt: new Date(Date.now() - 1 * 86400000), // expired yesterday
};

const mockRevokedToken = {
  ...mockValidToken,
  id: 3,
  token: "revokedtoken",
  isActive: false,
};

const mockPortalData = {
  client: {
    id: 1,
    name: "Dr. Carlos",
    clinic: "OdontoVida",
    email: "carlos@test.com",
    phone: "11999999999",
    city: "São Paulo",
    state: "SP",
  },
  lab: {
    labName: "Lab Teste",
    logoUrl: null,
    primaryColor: "#1a56db",
    email: "lab@teste.com",
    phone: "(11) 99999-9999",
    cnpj: null,
    address: null,
  },
  jobs: [
    {
      id: 1,
      code: "PF-2026-001",
      orderNumber: 1050,
      serviceName: "Coroa Metalocerâmica",
      patientName: "Maria Silva",
      tooth: "14",
      status: "in_production",
      progress: 30,
      deadline: new Date(Date.now() + 3 * 86400000),
      deliveredAt: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      logs: [],
    },
  ],
  summary: {
    total: 1,
    waiting: 0,
    inProduction: 1,
    review: 0,
    ready: 0,
    delivered: 0,
    overdue: 0,
  },
  tokenInfo: {
    label: "Acesso padrão",
    expiresAt: new Date(Date.now() + 30 * 86400000),
    accessCount: 5,
  },
};

vi.mock("./db.portal", () => ({
  validatePortalToken: vi.fn().mockImplementation(async (token: string) => {
    if (token === "abc123valid") return {
      valid: true,
      tokenRow: {
        id: 1, clientId: 1, token: "abc123valid", label: "Acesso padrão",
        isActive: true, expiresAt: new Date(Date.now() + 30 * 86400000),
        lastAccessAt: null, accessCount: 5, createdAt: new Date(),
      },
    };
    if (token === "expiredtoken") return { valid: false, reason: "Token expirado" };
    if (token === "revokedtoken") return { valid: false, reason: "Token revogado" };
    return { valid: false, reason: "Token não encontrado" };
  }),
  getPortalData: vi.fn().mockImplementation(async (token: string) => {
    if (token === "abc123valid") return {
      client: { id: 1, name: "Dr. Carlos", clinic: "OdontoVida", email: "carlos@test.com", phone: "11999999999", city: "São Paulo", state: "SP" },
      lab: { labName: "Lab Teste", logoUrl: null, primaryColor: "#1a56db", email: "lab@teste.com", phone: "(11) 99999-9999", cnpj: null, address: null },
      jobs: [{
        id: 1, code: "PF-2026-001", orderNumber: 1050, serviceName: "Coroa Metalocerâmica",
        patientName: "Maria Silva", tooth: "14", status: "in_production", progress: 30,
        deadline: new Date(Date.now() + 3 * 86400000), deliveredAt: null, notes: null,
        createdAt: new Date(), updatedAt: new Date(), logs: [],
      }],
      summary: { total: 1, waiting: 0, inProduction: 1, review: 0, ready: 0, delivered: 0, overdue: 0 },
      tokenInfo: { label: "Acesso padrão", expiresAt: new Date(Date.now() + 30 * 86400000), accessCount: 5 },
    };
    return null;
  }),
  trackPortalAccess: vi.fn().mockResolvedValue(undefined),
  generatePortalToken: vi.fn().mockResolvedValue("newtoken123"),
  listPortalTokens: vi.fn().mockResolvedValue([{
    id: 1, clientId: 1, token: "abc123valid", label: "Acesso padrão",
    isActive: true, expiresAt: new Date(Date.now() + 30 * 86400000),
    lastAccessAt: null, accessCount: 5, createdAt: new Date(),
  }]),
  revokePortalToken: vi.fn().mockResolvedValue(undefined),
  deletePortalToken: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  isEmailConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Resposta da Flow IA." } }],
  }),
}));

// ─── Helpers ───────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-openid",
    email: "patricia@proteticflow.com",
    name: "Patricia Lima",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createCollaboratorContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "colab-openid",
    email: "joao@proteticflow.com",
    name: "João Silva",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeCaller(ctx: TrpcContext) {
  return appRouter.createCaller(ctx);
}

// ─── Tests ─────────────────────────────────────────────────

describe("portal.validateToken (public)", () => {
  it("deve validar token ativo com sucesso", async () => {
    const caller = makeCaller(createUnauthContext());
    const result = await caller.portal.validateToken({ token: "abc123valid" });
    expect(result.valid).toBe(true);
  });

  it("deve rejeitar token expirado com UNAUTHORIZED", async () => {
    const caller = makeCaller(createUnauthContext());
    await expect(caller.portal.validateToken({ token: "expiredtoken" }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("deve rejeitar token revogado com UNAUTHORIZED", async () => {
    const caller = makeCaller(createUnauthContext());
    await expect(caller.portal.validateToken({ token: "revokedtoken" }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("deve rejeitar token inexistente com UNAUTHORIZED", async () => {
    const caller = makeCaller(createUnauthContext());
    await expect(caller.portal.validateToken({ token: "nonexistent" }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("deve rejeitar token vazio com validação Zod", async () => {
    const caller = makeCaller(createUnauthContext());
    await expect(caller.portal.validateToken({ token: "" }))
      .rejects.toThrow();
  });
});

describe("portal.getData (public)", () => {
  it("deve retornar dados do portal para token válido", async () => {
    const caller = makeCaller(createUnauthContext());
    const result = await caller.portal.getData({ token: "abc123valid" });
    expect(result.client.name).toBe("Dr. Carlos");
    expect(result.jobs).toHaveLength(1);
    expect(result.summary.total).toBe(1);
    expect(result.lab.labName).toBe("Lab Teste");
  });

  it("deve retornar OS com status correto", async () => {
    const caller = makeCaller(createUnauthContext());
    const result = await caller.portal.getData({ token: "abc123valid" });
    expect(result.jobs[0].status).toBe("in_production");
    expect(result.jobs[0].serviceName).toBe("Coroa Metalocerâmica");
  });

  it("deve retornar summary correto", async () => {
    const caller = makeCaller(createUnauthContext());
    const result = await caller.portal.getData({ token: "abc123valid" });
    expect(result.summary.inProduction).toBe(1);
    expect(result.summary.delivered).toBe(0);
  });

  it("deve rejeitar token inválido com UNAUTHORIZED", async () => {
    const caller = makeCaller(createUnauthContext());
    await expect(caller.portal.getData({ token: "invalid" }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("deve incluir tokenInfo com expiresAt e accessCount", async () => {
    const caller = makeCaller(createUnauthContext());
    const result = await caller.portal.getData({ token: "abc123valid" });
    expect(result.tokenInfo.accessCount).toBe(5);
    expect(result.tokenInfo.label).toBe("Acesso padrão");
    expect(result.tokenInfo.expiresAt).toBeInstanceOf(Date);
  });
});

describe("portal.listTokens (protectedProcedure)", () => {
  it("admin pode listar tokens de um cliente", async () => {
    const caller = makeCaller(createAdminContext());
    const result = await caller.portal.listTokens({ clientId: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].token).toBe("abc123valid");
  });

  it("colaborador pode listar tokens (listTokens é protectedProcedure)", async () => {
    const caller = makeCaller(createCollaboratorContext());
    const result = await caller.portal.listTokens({ clientId: 1 });
    expect(result).toHaveLength(1);
  });

  it("usuário não autenticado não pode listar tokens", async () => {
    const caller = makeCaller(createUnauthContext());
    await expect(caller.portal.listTokens({ clientId: 1 }))
      .rejects.toThrow();
  });
});

describe("portal.generateToken (adminProcedure)", () => {
  it("admin pode gerar token com validade de 90 dias", async () => {
    const caller = makeCaller(createAdminContext());
    const result = await caller.portal.generateToken({
      clientId: 1,
      label: "Acesso 2026",
      expiresDays: 90,
    });
    expect(result.token).toBe("newtoken123");
  });

  it("admin pode gerar token com validade de 365 dias", async () => {
    const caller = makeCaller(createAdminContext());
    const result = await caller.portal.generateToken({
      clientId: 1,
      expiresDays: 365,
    });
    expect(result.token).toBeDefined();
  });

  it("colaborador NÃO pode gerar token (adminProcedure)", async () => {
    const caller = makeCaller(createCollaboratorContext());
    await expect(caller.portal.generateToken({
      clientId: 1,
      expiresDays: 90,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("usuário não autenticado NÃO pode gerar token", async () => {
    const caller = makeCaller(createUnauthContext());
    await expect(caller.portal.generateToken({
      clientId: 1,
      expiresDays: 90,
    })).rejects.toThrow();
  });
});

describe("portal.revokeToken (adminProcedure)", () => {
  it("admin pode revogar token", async () => {
    const caller = makeCaller(createAdminContext());
    const result = await caller.portal.revokeToken({ tokenId: 1 });
    expect(result.success).toBe(true);
  });

  it("colaborador NÃO pode revogar token", async () => {
    const caller = makeCaller(createCollaboratorContext());
    await expect(caller.portal.revokeToken({ tokenId: 1 }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("portal.deleteToken (adminProcedure)", () => {
  it("admin pode deletar token", async () => {
    const caller = makeCaller(createAdminContext());
    const result = await caller.portal.deleteToken({ tokenId: 1 });
    expect(result.success).toBe(true);
  });

  it("colaborador NÃO pode deletar token", async () => {
    const caller = makeCaller(createCollaboratorContext());
    await expect(caller.portal.deleteToken({ tokenId: 1 }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("portal.sendPortalLink (adminProcedure)", () => {
  it("admin pode enviar link do portal por e-mail", async () => {
    const caller = makeCaller(createAdminContext());
    const result = await caller.portal.sendPortalLink({
      clientId: 1,
      clientName: "Dr. Carlos",
      clientEmail: "carlos@test.com",
      token: "abc123valid",
      origin: "https://app.proteticflow.com",
    });
    expect(result.success).toBe(true);
  });

  it("admin pode enviar com mensagem personalizada", async () => {
    const caller = makeCaller(createAdminContext());
    const result = await caller.portal.sendPortalLink({
      clientId: 1,
      clientName: "Dr. Carlos",
      clientEmail: "carlos@test.com",
      token: "abc123valid",
      origin: "https://app.proteticflow.com",
      customMessage: "Olá Dr. Carlos, segue seu acesso ao portal!",
    });
    expect(result.success).toBe(true);
  });

  it("colaborador NÃO pode enviar link do portal", async () => {
    const caller = makeCaller(createCollaboratorContext());
    await expect(caller.portal.sendPortalLink({
      clientId: 1,
      clientName: "Dr. Carlos",
      clientEmail: "carlos@test.com",
      token: "abc123valid",
      origin: "https://app.proteticflow.com",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("deve rejeitar e-mail inválido com erro de validação", async () => {
    const caller = makeCaller(createAdminContext());
    await expect(caller.portal.sendPortalLink({
      clientId: 1,
      clientName: "Dr. Carlos",
      clientEmail: "not-an-email",
      token: "abc123valid",
      origin: "https://app.proteticflow.com",
    })).rejects.toThrow();
  });
});
