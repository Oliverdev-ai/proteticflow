import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { TRPCError } from "@trpc/server";

// ─── Mock db module ────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({}),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  listClients: vi.fn().mockResolvedValue([
    { id: 1, name: "Dr. Carlos", clinic: "OdontoVida", email: "carlos@test.com", phone: "11999999999", city: "São Paulo", state: "SP", status: "active", totalJobs: 5, totalRevenue: "2500.00", createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, name: "Dra. Ana", clinic: "Sorriso", email: "ana@test.com", phone: "11888888888", city: "Rio", state: "RJ", status: "active", totalJobs: 3, totalRevenue: "1800.00", createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getClient: vi.fn().mockResolvedValue({ id: 1, name: "Dr. Carlos", clinic: "OdontoVida" }),
  createClient: vi.fn().mockResolvedValue({ id: 3 }),
  updateClient: vi.fn().mockResolvedValue(undefined),
  deleteClient: vi.fn().mockResolvedValue(undefined),
  listPriceItems: vi.fn().mockResolvedValue([
    { id: 1, name: "Coroa Metalocerâmica", category: "Coroas", material: "Metalocerâmica", estimatedDays: 7, price: "350.00", isActive: true },
  ]),
  createPriceItem: vi.fn().mockResolvedValue({ id: 1 }),
  updatePriceItem: vi.fn().mockResolvedValue(undefined),
  deletePriceItem: vi.fn().mockResolvedValue(undefined),
  listJobs: vi.fn().mockResolvedValue([
    { id: 1, code: "PF-2026-001", clientId: 1, clientName: "Dr. Carlos", clientClinic: "OdontoVida", serviceName: "Coroa", tooth: "14", status: "in_production", progress: 50, price: "350.00", deadline: new Date(), notes: null, createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getJob: vi.fn().mockResolvedValue({ id: 1, code: "PF-2026-001", serviceName: "Coroa" }),
  createJob: vi.fn().mockResolvedValue({ id: 1 }),
  updateJob: vi.fn().mockResolvedValue(undefined),
  deleteJob: vi.fn().mockResolvedValue(undefined),
  generateJobCode: vi.fn().mockResolvedValue("PF-2026-001"),
  getDashboardStats: vi.fn().mockResolvedValue({
    totalJobs: 12, totalClients: 8, todayDeliveries: 3, monthlyRevenue: "42500", overdueJobs: 1,
  }),
  listNotifications: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, title: "Prazo próximo", message: "Trabalho PF-2026-001 vence amanhã", type: "deadline", isRead: false, createdAt: new Date() },
  ]),
  getUnreadNotificationCount: vi.fn().mockResolvedValue(3),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
  createNotification: vi.fn().mockResolvedValue(undefined),
  listChatMessages: vi.fn().mockResolvedValue([]),
  saveChatMessage: vi.fn().mockResolvedValue(undefined),
  // Gestão de Usuários
  listUsers: vi.fn().mockResolvedValue([
    { id: 1, openId: "admin-openid", name: "Patricia Lima", email: "patricia@proteticflow.com", role: "admin", isActive: true, lastSignedIn: new Date(), createdAt: new Date() },
    { id: 2, openId: "colab-openid", name: "João Silva", email: "joao@proteticflow.com", role: "user", isActive: true, lastSignedIn: new Date(), createdAt: new Date() },
  ]),
  createInvite: vi.fn().mockResolvedValue({ token: "invite-token-abc123def456" }),
  listInvites: vi.fn().mockResolvedValue([
    { id: 1, email: "novo@test.com", role: "user", status: "pending", token: "invite-token-abc123def456", invitedBy: 1, expiresAt: new Date(Date.now() + 7 * 86400000), createdAt: new Date() },
  ]),
  revokeInvite: vi.fn().mockResolvedValue(undefined),
  updateUserRole: vi.fn().mockResolvedValue(undefined),
  deactivateUser: vi.fn().mockResolvedValue(undefined),
  reactivateUser: vi.fn().mockResolvedValue(undefined),
  // Blocos de OS
  listOrderBlocks: vi.fn().mockResolvedValue([
    { id: 1, clientId: 1, clientName: "Dr. Carlos", blockStart: 1001, blockEnd: 1100, description: "Bloco 2026", createdAt: new Date() },
  ]),
  createOrderBlock: vi.fn().mockResolvedValue({ id: 1 }),
  updateOrderBlock: vi.fn().mockResolvedValue(undefined),
  deleteOrderBlock: vi.fn().mockResolvedValue(undefined),
  resolveClientByOrderNumber: vi.fn().mockResolvedValue({ clientId: 1, clientName: "Dr. Carlos", blockStart: 1001, blockEnd: 1100 }),
  getJobByOrderNumber: vi.fn().mockResolvedValue({ id: 1, code: "PF-2026-001", serviceName: "Coroa", status: "in_production", patientName: "Maria" }),
  // Financeiro
  listAccountsReceivable: vi.fn().mockResolvedValue([
    { id: 1, jobId: 1, clientId: 1, clientName: "Dr. Carlos", jobCode: "PF-2026-001", amount: "350.00", status: "pending", dueDate: new Date(), createdAt: new Date() },
  ]),
  createAccountReceivable: vi.fn().mockResolvedValue({ id: 1 }),
  updateAccountReceivable: vi.fn().mockResolvedValue(undefined),
  markAccountReceivablePaid: vi.fn().mockResolvedValue(undefined),
  autoCreateReceivableForJob: vi.fn().mockResolvedValue(undefined),
  listFinancialClosings: vi.fn().mockResolvedValue([
    { id: 1, clientId: 1, clientName: "Dr. Carlos", period: "2026-03", totalAmount: "2500.00", totalJobs: 5, status: "open", createdAt: new Date() },
  ]),
  generateMonthlyClosing: vi.fn().mockResolvedValue({ id: 1 }),
  closeMonthlyClosing: vi.fn().mockResolvedValue(undefined),
  markClosingPaid: vi.fn().mockResolvedValue(undefined),
  getClientStatement: vi.fn().mockResolvedValue({
    client: { id: 1, name: "Dr. Carlos" },
    items: [
      { jobId: 1, jobCode: "PF-2026-001", orderNumber: 1050, serviceName: "Coroa", patientName: "Maria", tooth: "14", price: "350.00", deliveredAt: new Date(), createdAt: new Date(), arStatus: "paid", arPaidAt: new Date() },
    ],
    totals: { total: 350, paid: 350, pending: 0 },
  }),
  listAccountsPayable: vi.fn().mockResolvedValue([
    { id: 1, description: "Material Cerâmico", supplier: "DentalSupply", amount: "800.00", dueDate: new Date(), status: "pending", category: "material", createdAt: new Date() },
  ]),
  createAccountPayable: vi.fn().mockResolvedValue({ id: 1 }),
  updateAccountPayable: vi.fn().mockResolvedValue(undefined),
  markAccountPayablePaid: vi.fn().mockResolvedValue(undefined),
  // Deadline Check
  getJobsApproachingDeadline: vi.fn().mockResolvedValue([
    { id: 1, code: "PF-2026-001", serviceName: "Coroa", clientName: "Dr. Carlos", status: "in_production", deadline: new Date(Date.now() + 12 * 3600000) },
  ]),
  getAllActiveUserIds: vi.fn().mockResolvedValue([1, 2]),
  hasDeadlineNotification: vi.fn().mockResolvedValue(false),
  logDeadlineNotification: vi.fn().mockResolvedValue(undefined),
}));

// ─── Mock db.stock ──────────────────────────────────────────────────
vi.mock("./db.stock", () => ({
  listMaterialCategories: vi.fn().mockResolvedValue([]),
  createMaterialCategory: vi.fn().mockResolvedValue({ id: 1 }),
  updateMaterialCategory: vi.fn().mockResolvedValue(undefined),
  deleteMaterialCategory: vi.fn().mockResolvedValue(undefined),
  listSuppliers: vi.fn().mockResolvedValue([]),
  getSupplier: vi.fn().mockResolvedValue(undefined),
  createSupplier: vi.fn().mockResolvedValue({ id: 1 }),
  updateSupplier: vi.fn().mockResolvedValue(undefined),
  deactivateSupplier: vi.fn().mockResolvedValue(undefined),
  listMaterials: vi.fn().mockResolvedValue([]),
  getMaterial: vi.fn().mockResolvedValue(undefined),
  createMaterial: vi.fn().mockResolvedValue({ id: 1 }),
  updateMaterial: vi.fn().mockResolvedValue(undefined),
  deactivateMaterial: vi.fn().mockResolvedValue(undefined),
  getLowStockMaterials: vi.fn().mockResolvedValue([]),
  getStockSummary: vi.fn().mockResolvedValue({ totalMaterials: 0, lowStockCount: 0, totalValue: 0, categories: 0 }),
  listStockMovements: vi.fn().mockResolvedValue([]),
  registerMovement: vi.fn().mockResolvedValue({ id: 1, stockAfter: 5, isLow: false, materialName: "Material", minStock: 1 }),
  getStockConsumptionReport: vi.fn().mockResolvedValue([]),
}));

//// ─── Mock LLM ──────────────────────────────────────────────
vi.mock("./_core/llm",() => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Resposta da Flow IA com dados do laboratório." } }],
  }),
}));

// ─── Mock Push ─────────────────────────────────────────────
vi.mock("./db.push", () => ({
  upsertPushSubscription: vi.fn(),
  deletePushSubscription: vi.fn(),
  getUserPushSubscriptions: vi.fn().mockResolvedValue([]),
  getAllPushSubscriptions: vi.fn().mockResolvedValue([]),
  deleteExpiredSubscription: vi.fn(),
  touchPushSubscription: vi.fn(),
}));

vi.mock("./push", () => ({
  isVapidConfigured: vi.fn().mockReturnValue(false),
  sendPushToSubscription: vi.fn().mockResolvedValue(true),
  sendPushToUser: vi.fn().mockResolvedValue(0),
  broadcastPush: vi.fn().mockResolvedValue({ sent: 0, failed: 0, total: 0 }),
}));

// ─── Helpers ─────────────────────────────────────────────────

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
    openId: "collaborator-openid",
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

// Backward compat alias
const createAuthContext = createAdminContext;

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════
// RBAC: Role-Based Access Control Tests
// ═══════════════════════════════════════════════════════════

describe("RBAC: Unauthenticated users are blocked", () => {
  it("clients.list requires authentication", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.clients.list()).rejects.toThrow();
  });

  it("jobs.list requires authentication", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.jobs.list()).rejects.toThrow();
  });

  it("prices.list requires authentication", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.prices.list()).rejects.toThrow();
  });

  it("dashboard.stats requires authentication", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.dashboard.stats()).rejects.toThrow();
  });

  it("notifications.list requires authentication", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.notifications.list()).rejects.toThrow();
  });

  it("chat.send requires authentication", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.chat.send({ message: "hello" })).rejects.toThrow();
  });
});

describe("RBAC: Admin-only procedures block collaborators", () => {
  it("prices.create rejects collaborator", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(
      caller.prices.create({ name: "Test", category: "Test", price: "100" })
    ).rejects.toThrow(/permission/i);
  });

  it("prices.update rejects collaborator", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(
      caller.prices.update({ id: 1, price: "200" })
    ).rejects.toThrow(/permission/i);
  });

  it("prices.delete rejects collaborator", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(
      caller.prices.delete({ id: 1 })
    ).rejects.toThrow(/permission/i);
  });

  it("clients.delete rejects collaborator", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(
      caller.clients.delete({ id: 1 })
    ).rejects.toThrow(/permission/i);
  });

  it("jobs.delete rejects collaborator", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(
      caller.jobs.delete({ id: 1 })
    ).rejects.toThrow(/permission/i);
  });
});

describe("RBAC: Admin-only procedures allow admin", () => {
  it("prices.create allows admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.prices.create({ name: "Test", category: "Test", price: "100" });
    expect(result).toEqual({ id: 1 });
  });

  it("prices.update allows admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.prices.update({ id: 1, price: "200" });
    expect(result).toEqual({ success: true });
  });

  it("prices.delete allows admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.prices.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("clients.delete allows admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.clients.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("jobs.delete allows admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.jobs.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

describe("RBAC: Collaborator can access shared procedures", () => {
  it("collaborator can list clients", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    const result = await caller.clients.list();
    expect(result).toHaveLength(2);
  });

  it("collaborator can create clients", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    const result = await caller.clients.create({ name: "Dr. Novo" });
    expect(result).toEqual({ id: 3 });
  });

  it("collaborator can update clients", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    const result = await caller.clients.update({ id: 1, name: "Updated" });
    expect(result).toEqual({ success: true });
  });

  it("collaborator can list jobs", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    const result = await caller.jobs.list();
    expect(result).toHaveLength(1);
  });

  it("collaborator can create jobs", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    const result = await caller.jobs.create({
      clientId: 1,
      serviceName: "Coroa",
      price: "350.00",
      deadline: new Date("2026-04-01"),
    });
    expect(result).toEqual({ id: 1 });
  });

  it("collaborator can update job status (dar baixa)", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    const result = await caller.jobs.update({ id: 1, status: "delivered", progress: 100 });
    expect(result).toEqual({ success: true });
  });

  it("collaborator can list prices (read-only)", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    const result = await caller.prices.list();
    expect(result).toHaveLength(1);
  });

  it("collaborator can use Flow IA", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    const result = await caller.chat.send({ message: "Entregas de hoje?" });
    expect(result.content).toBeDefined();
  });

  it("collaborator can manage notifications", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    const result = await caller.notifications.list();
    expect(result).toHaveLength(1);
  });
});

describe("RBAC: Dashboard stats hide financials from collaborator", () => {
  it("admin sees full dashboard stats with revenue", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.dashboard.stats();
    expect(result.monthlyRevenue).toBe("42500");
    expect(result.totalJobs).toBe(12);
    expect(result.totalClients).toBe(8);
  });

  it("collaborator sees dashboard stats with masked revenue", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    const result = await caller.dashboard.stats();
    expect(result.monthlyRevenue).toBe("***");
    expect(result.totalJobs).toBe(12);
    expect(result.totalClients).toBe(8);
    expect(result.todayDeliveries).toBe(3);
    expect(result.overdueJobs).toBe(1);
  });
});

describe("RBAC: Flow IA respects role context", () => {
  it("admin Flow IA receives financial context", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.chat.send({ message: "Qual o faturamento?" });

    const llm = await import("./_core/llm");
    const callArgs = (llm.invokeLLM as any).mock.calls[0][0];
    const systemMsg = callArgs.messages.find((m: any) => m.role === "system");
    expect(systemMsg.content).toContain("Faturamento mensal: R$ 42500");
    expect(systemMsg.content).toContain("Administrador");
    expect(systemMsg.content).not.toContain("Acesso restrito");
  });

  it("collaborator Flow IA does NOT receive financial data", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await caller.chat.send({ message: "Qual o faturamento?" });

    const llm = await import("./_core/llm");
    const callArgs = (llm.invokeLLM as any).mock.calls[0][0];
    const systemMsg = callArgs.messages.find((m: any) => m.role === "system");
    expect(systemMsg.content).toContain("Acesso restrito ao administrador");
    expect(systemMsg.content).toContain("Colaborador");
    expect(systemMsg.content).toContain("**NUNCA** revele dados financeiros");
    expect(systemMsg.content).not.toContain("R$ 42500");
  });
});

// ═══════════════════════════════════════════════════════════
// Feature Tests: Clients
// ═══════════════════════════════════════════════════════════

describe("Clients Router", () => {
  it("lists clients successfully", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.clients.list();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Dr. Carlos");
  });

  it("lists clients with search filter", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await caller.clients.list({ search: "Carlos" });
    const db = await import("./db");
    expect(db.listClients).toHaveBeenCalledWith("Carlos", undefined);
  });

  it("gets a single client by id", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.clients.get({ id: 1 });
    expect(result).toBeDefined();
    expect(result?.name).toBe("Dr. Carlos");
  });

  it("creates a client with valid data", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.clients.create({
      name: "Dr. Novo",
      clinic: "Clínica Nova",
      email: "novo@test.com",
      phone: "11777777777",
      city: "Curitiba",
      state: "PR",
    });
    expect(result).toEqual({ id: 3 });
    const db = await import("./db");
    expect(db.createClient).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Dr. Novo", createdBy: 1 })
    );
  });

  it("rejects client creation with empty name", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.clients.create({ name: "" })).rejects.toThrow();
  });

  it("updates a client", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.clients.update({ id: 1, name: "Dr. Carlos Updated" });
    expect(result).toEqual({ success: true });
  });

  it("deletes a client", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.clients.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

// ═══════════════════════════════════════════════════════════
// Feature Tests: Prices
// ═══════════════════════════════════════════════════════════

describe("Prices Router", () => {
  it("lists price items", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.prices.list();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Coroa Metalocerâmica");
  });

  it("creates a price item", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.prices.create({
      name: "Faceta Laminada",
      category: "Facetas",
      material: "Porcelana",
      estimatedDays: 10,
      price: "800.00",
    });
    expect(result).toEqual({ id: 1 });
  });

  it("rejects price item with empty name", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.prices.create({ name: "", category: "Test", price: "100" })
    ).rejects.toThrow();
  });

  it("updates a price item", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.prices.update({ id: 1, price: "400.00" });
    expect(result).toEqual({ success: true });
  });

  it("deletes (soft) a price item", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.prices.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

// ═══════════════════════════════════════════════════════════
// Feature Tests: Jobs
// ═══════════════════════════════════════════════════════════

describe("Jobs Router", () => {
  it("lists jobs", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.jobs.list();
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("PF-2026-001");
  });

  it("gets a single job", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.jobs.get({ id: 1 });
    expect(result).toBeDefined();
    expect(result?.code).toBe("PF-2026-001");
  });

  it("creates a job with auto-generated code", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.jobs.create({
      clientId: 1,
      serviceName: "Coroa Zircônia",
      price: "500.00",
      deadline: new Date("2026-03-15"),
    });
    expect(result).toEqual({ id: 1 });
    const db = await import("./db");
    expect(db.generateJobCode).toHaveBeenCalled();
    expect(db.createJob).toHaveBeenCalledWith(
      expect.objectContaining({ code: "PF-2026-001", createdBy: 1 })
    );
  });

  it("updates job status", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.jobs.update({ id: 1, status: "ready", progress: 100 });
    expect(result).toEqual({ success: true });
  });

  it("rejects invalid job status", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.jobs.update({ id: 1, status: "invalid_status" as any })
    ).rejects.toThrow();
  });

  it("deletes a job", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.jobs.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

// ═══════════════════════════════════════════════════════════
// Feature Tests: Dashboard
// ═══════════════════════════════════════════════════════════

describe("Dashboard Router", () => {
  it("returns full dashboard stats for admin", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.dashboard.stats();
    expect(result).toEqual({
      totalJobs: 12,
      totalClients: 8,
      todayDeliveries: 3,
      monthlyRevenue: "42500",
      overdueJobs: 1,
    });
  });
});

// ═══════════════════════════════════════════════════════════
// Feature Tests: Notifications
// ═══════════════════════════════════════════════════════════

describe("Notifications Router", () => {
  it("lists notifications for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.notifications.list();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Prazo próximo");
    const db = await import("./db");
    expect(db.listNotifications).toHaveBeenCalledWith(1);
  });

  it("returns unread notification count", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.notifications.unreadCount();
    expect(result).toBe(3);
  });

  it("marks a single notification as read", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.notifications.markRead({ id: 1 });
    expect(result).toEqual({ success: true });
    const db = await import("./db");
    expect(db.markNotificationRead).toHaveBeenCalledWith(1, 1);
  });

  it("marks all notifications as read", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.notifications.markAllRead();
    expect(result).toEqual({ success: true });
    const db = await import("./db");
    expect(db.markAllNotificationsRead).toHaveBeenCalledWith(1);
  });
});

// ═══════════════════════════════════════════════════════════
// Feature Tests: Chat (Flow IA)
// ═══════════════════════════════════════════════════════════

describe("Chat (Flow IA) Router", () => {
  it("returns chat history", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.chat.history();
    expect(result).toEqual([]);
    const db = await import("./db");
    expect(db.listChatMessages).toHaveBeenCalledWith(1);
  });

  it("sends a message and gets LLM response", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.chat.send({ message: "Quais entregas de hoje?" });
    expect(result.content).toBe("Resposta da Flow IA com dados do laboratório.");
    const db = await import("./db");
    expect(db.saveChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, role: "user", content: "Quais entregas de hoje?" })
    );
    expect(db.saveChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, role: "assistant" })
    );
    const llm = await import("./_core/llm");
    expect(llm.invokeLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "system" }),
          expect.objectContaining({ role: "user", content: "Quais entregas de hoje?" }),
        ]),
      })
    );
  });

  it("rejects empty message", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.chat.send({ message: "" })).rejects.toThrow();
  });

  it("handles LLM failure gracefully", async () => {
    const llm = await import("./_core/llm");
    (llm.invokeLLM as any).mockRejectedValueOnce(new Error("LLM timeout"));

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.chat.send({ message: "teste" });
    expect(result.content).toContain("dificuldades técnicas");
  });
});

// ═══════════════════════════════════════════════════════════
// Input Validation
// ═══════════════════════════════════════════════════════════

describe("Input Validation", () => {
  it("rejects invalid email on client create", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.clients.create({ name: "Test", email: "not-an-email" })
    ).rejects.toThrow();
  });

  it("rejects state with more than 2 chars", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.clients.create({ name: "Test", state: "SPP" })
    ).rejects.toThrow();
  });

  it("rejects job progress > 100", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.jobs.update({ id: 1, progress: 150 })
    ).rejects.toThrow();
  });

  it("rejects negative estimated days on price", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.prices.create({ name: "Test", category: "Test", price: "100", estimatedDays: 0 })
    ).rejects.toThrow();
  });
});


// ═══════════════════════════════════════════════════════════
// Feature Tests: Admin User Management
// ═══════════════════════════════════════════════════════════

describe("Admin Users Router", () => {
  it("admin can list all users", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.adminUsers.list();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Patricia Lima");
    expect(result[1].name).toBe("João Silva");
  });

  it("collaborator CANNOT list users", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(caller.adminUsers.list()).rejects.toThrow(/permission/i);
  });

  it("unauthenticated CANNOT list users", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.adminUsers.list()).rejects.toThrow();
  });

  it("admin can invite a collaborator", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.adminUsers.invite({
      email: "novo@proteticflow.com",
      role: "user",
    });
    expect(result.success).toBe(true);
    expect(result.token).toBe("invite-token-abc123def456");
    const db = await import("./db");
    expect(db.createInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "novo@proteticflow.com",
        role: "user",
        invitedBy: 1,
      })
    );
  });

  it("admin can invite an admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.adminUsers.invite({
      email: "admin2@proteticflow.com",
      role: "admin",
    });
    expect(result.success).toBe(true);
  });

  it("collaborator CANNOT invite users", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(
      caller.adminUsers.invite({ email: "test@test.com", role: "user" })
    ).rejects.toThrow(/permission/i);
  });

  it("rejects invite with invalid email", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.adminUsers.invite({ email: "not-an-email", role: "user" })
    ).rejects.toThrow();
  });

  it("admin can list invites", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.adminUsers.listInvites();
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("novo@test.com");
    expect(result[0].status).toBe("pending");
  });

  it("collaborator CANNOT list invites", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(caller.adminUsers.listInvites()).rejects.toThrow(/permission/i);
  });

  it("admin can revoke an invite", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.adminUsers.revokeInvite({ id: 1 });
    expect(result).toEqual({ success: true });
    const db = await import("./db");
    expect(db.revokeInvite).toHaveBeenCalledWith(1);
  });

  it("collaborator CANNOT revoke invites", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(caller.adminUsers.revokeInvite({ id: 1 })).rejects.toThrow(/permission/i);
  });

  it("admin can update user role to admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.adminUsers.updateRole({ id: 2, role: "admin" });
    expect(result).toEqual({ success: true });
    const db = await import("./db");
    expect(db.updateUserRole).toHaveBeenCalledWith(2, "admin");
  });

  it("admin can downgrade user to collaborator", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.adminUsers.updateRole({ id: 2, role: "user" });
    expect(result).toEqual({ success: true });
    const db = await import("./db");
    expect(db.updateUserRole).toHaveBeenCalledWith(2, "user");
  });

  it("collaborator CANNOT update roles", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(
      caller.adminUsers.updateRole({ id: 1, role: "user" })
    ).rejects.toThrow(/permission/i);
  });

  it("admin can deactivate a user", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.adminUsers.deactivate({ id: 2 });
    expect(result).toEqual({ success: true });
    const db = await import("./db");
    expect(db.deactivateUser).toHaveBeenCalledWith(2);
  });

  it("collaborator CANNOT deactivate users", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(caller.adminUsers.deactivate({ id: 1 })).rejects.toThrow(/permission/i);
  });

  it("admin can reactivate a user", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.adminUsers.reactivate({ id: 2 });
    expect(result).toEqual({ success: true });
    const db = await import("./db");
    expect(db.reactivateUser).toHaveBeenCalledWith(2);
  });

  it("collaborator CANNOT reactivate users", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(caller.adminUsers.reactivate({ id: 2 })).rejects.toThrow(/permission/i);
  });
});

// ═══════════════════════════════════════════════════════════
// Feature Tests: Deadline Check (24h Auto-Notifications)
// ═══════════════════════════════════════════════════════════

describe("Deadline Check Router", () => {
  it("admin can trigger manual deadline check", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.deadlineCheck.run();
    expect(result.checked).toBe(1);
    expect(result.notificationsCreated).toBe(1);

    const db = await import("./db");
    expect(db.getJobsApproachingDeadline).toHaveBeenCalled();
    expect(db.getAllActiveUserIds).toHaveBeenCalled();
    expect(db.hasDeadlineNotification).toHaveBeenCalledWith(1);
    // Should create notification for each active user
    expect(db.createNotification).toHaveBeenCalledTimes(2);
    expect(db.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        title: expect.stringContaining("Prazo em 24h"),
        type: "warning",
        relatedJobId: 1,
      })
    );
    expect(db.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 2,
        title: expect.stringContaining("Prazo em 24h"),
      })
    );
    expect(db.logDeadlineNotification).toHaveBeenCalledWith(1);
  });

  it("collaborator CANNOT trigger deadline check", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(caller.deadlineCheck.run()).rejects.toThrow(/permission/i);
  });

  it("unauthenticated CANNOT trigger deadline check", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.deadlineCheck.run()).rejects.toThrow();
  });

  it("skips jobs already notified", async () => {
    const db = await import("./db");
    (db.hasDeadlineNotification as any).mockResolvedValueOnce(true);

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.deadlineCheck.run();
    expect(result.checked).toBe(1);
    expect(result.notificationsCreated).toBe(0);
    expect(db.createNotification).not.toHaveBeenCalled();
    expect(db.logDeadlineNotification).not.toHaveBeenCalled();
  });

  it("handles no approaching deadlines gracefully", async () => {
    const db = await import("./db");
    (db.getJobsApproachingDeadline as any).mockResolvedValueOnce([]);

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.deadlineCheck.run();
    expect(result.checked).toBe(0);
    expect(result.notificationsCreated).toBe(0);
  });
});


// ═══════════════════════════════════════════════════════════
// FASE 9: BLOCOS DE OS + RESOLUÇÃO AUTOMÁTICA
// ═══════════════════════════════════════════════════════════

describe("orderBlocks", () => {
  it("admin can list order blocks", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.orderBlocks.list({});
    expect(result).toHaveLength(1);
    expect(result[0].clientName).toBe("Dr. Carlos");
    expect(result[0].blockStart).toBe(1001);
  });

  it("collaborator can list order blocks", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    const result = await caller.orderBlocks.list({});
    expect(result).toHaveLength(1);
  });

  it("admin can create order block", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.orderBlocks.create({
      clientId: 1,
      blockStart: 2001,
      blockEnd: 2100,
      description: "Bloco 2026-B",
    });
    expect(result.id).toBe(1);
  });

  it("collaborator CANNOT create order block", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(
      caller.orderBlocks.create({ clientId: 1, blockStart: 2001, blockEnd: 2100 })
    ).rejects.toThrow(TRPCError);
  });

  it("admin can update order block", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.orderBlocks.update({ id: 1, blockEnd: 1200 })
    ).resolves.not.toThrow();
  });

  it("admin can delete order block", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.orderBlocks.delete({ id: 1 })
    ).resolves.not.toThrow();
  });

  it("collaborator CANNOT delete order block", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(
      caller.orderBlocks.delete({ id: 1 })
    ).rejects.toThrow(TRPCError);
  });

  it("resolves client by OS number", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.orderBlocks.resolveClient({ orderNumber: 1050 });
    expect(result.clientName).toBe("Dr. Carlos");
    expect(result.blockStart).toBe(1001);
  });

  it("unauthenticated user CANNOT access order blocks", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.orderBlocks.list({})).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// FASE 10: MÓDULO FINANCEIRO COMPLETO
// ═══════════════════════════════════════════════════════════

describe("financial.receivables", () => {
  it("admin can list accounts receivable", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.financial.receivables.list({});
    expect(result).toHaveLength(1);
    expect(result[0].clientName).toBe("Dr. Carlos");
    expect(result[0].amount).toBe("350.00");
  });

  it("collaborator CANNOT list accounts receivable", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(
      caller.financial.receivables.list({})
    ).rejects.toThrow(TRPCError);
  });

  it("admin can mark receivable as paid", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.financial.receivables.markPaid({ id: 1 })
    ).resolves.not.toThrow();
  });

  it("collaborator CANNOT mark receivable as paid", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(
      caller.financial.receivables.markPaid({ id: 1 })
    ).rejects.toThrow(TRPCError);
  });

  it("unauthenticated user CANNOT access receivables", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.financial.receivables.list({})).rejects.toThrow();
  });
});

describe("financial.closings", () => {
  it("admin can list financial closings", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.financial.closings.list({});
    expect(result).toHaveLength(1);
    expect(result[0].period).toBe("2026-03");
    expect(result[0].totalAmount).toBe("2500.00");
  });

  it("admin can generate monthly closing", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.financial.closings.generate({
      clientId: 1,
      period: "2026-03",
    });
    expect(result.id).toBe(1);
  });

  it("admin can close a monthly closing", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.financial.closings.close({ id: 1 })
    ).resolves.not.toThrow();
  });

  it("admin can mark closing as paid", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.financial.closings.markPaid({ id: 1 })
    ).resolves.not.toThrow();
  });

  it("collaborator CANNOT generate closing", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(
      caller.financial.closings.generate({ clientId: 1, period: "2026-03" })
    ).rejects.toThrow(TRPCError);
  });

  it("collaborator CANNOT list closings", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(
      caller.financial.closings.list({})
    ).rejects.toThrow(TRPCError);
  });
});

describe("financial.statement", () => {
  it("admin can get client statement", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.financial.statement({
      clientId: 1,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    });
    expect(result.client?.name).toBe("Dr. Carlos");
    expect(result.items).toHaveLength(1);
    expect(result.totals.total).toBe(350);
    expect(result.totals.paid).toBe(350);
    expect(result.totals.pending).toBe(0);
  });

  it("collaborator CANNOT get client statement", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(
      caller.financial.statement({
        clientId: 1,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      })
    ).rejects.toThrow(TRPCError);
  });
});

describe("financial.payables", () => {
  it("admin can list accounts payable", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.financial.payables.list({});
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("Material Cerâmico");
    expect(result[0].amount).toBe("800.00");
  });

  it("admin can create account payable", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.financial.payables.create({
      description: "Aluguel",
      amount: "2000.00",
      dueDate: new Date(),
      category: "fixed",
    });
    expect(result.id).toBe(1);
  });

  it("admin can mark payable as paid", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.financial.payables.markPaid({ id: 1 })
    ).resolves.not.toThrow();
  });

  it("collaborator CANNOT list payables", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(
      caller.financial.payables.list({})
    ).rejects.toThrow(TRPCError);
  });

  it("collaborator CANNOT create payable", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(
      caller.financial.payables.create({
        description: "Aluguel",
        amount: "2000.00",
        dueDate: new Date(),
        category: "fixed",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("unauthenticated user CANNOT access payables", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.financial.payables.list({})).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// FLOW IA — CONTEXTO FINANCEIRO EXPANDIDO
// ═══════════════════════════════════════════════════════════

describe("chat.send — expanded context", () => {
  it("admin chat includes financial data in context", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.chat.send({ message: "Faça o fechamento do Dr. Carlos" });
    expect(result.content).toBeDefined();
    expect(typeof result.content).toBe("string");
  });

  it("collaborator chat does NOT include financial data", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    const result = await caller.chat.send({ message: "Quais trabalhos estão pendentes?" });
    expect(result.content).toBeDefined();
  });

  it("chat with OS number triggers resolution", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.chat.send({ message: "De quem é a OS 1050?" });
    expect(result.content).toBeDefined();
  });
});
