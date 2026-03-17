/**
 * Kanban Router Tests — ProteticFlow
 * Testes para o quadro Kanban de produção: getBoard, moveJob, getValidTransitions
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock db module ────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({}),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  listClients: vi.fn().mockResolvedValue([
    { id: 1, name: "Dr. Carlos", clinic: "OdontoVida", email: "carlos@test.com", phone: "11999999999", city: "São Paulo", state: "SP", status: "active", totalJobs: 5, totalRevenue: "2500.00", createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getClient: vi.fn().mockResolvedValue({ id: 1, name: "Dr. Carlos" }),
  createClient: vi.fn().mockResolvedValue({ id: 1 }),
  updateClient: vi.fn(),
  deleteClient: vi.fn(),
  listPriceItems: vi.fn().mockResolvedValue([]),
  createPriceItem: vi.fn().mockResolvedValue({ id: 1 }),
  updatePriceItem: vi.fn(),
  deletePriceItem: vi.fn(),
  listJobs: vi.fn().mockResolvedValue([
    {
      id: 1, code: "PF-2026-001", clientId: 1, clientName: "Dr. Carlos", clientClinic: "OdontoVida",
      orderNumber: 1050, patientName: "Maria Silva",
      serviceName: "Coroa Metalocerâmica", tooth: "14", status: "waiting",
      progress: 0, price: "350.00",
      deadline: new Date(Date.now() + 3 * 86400000), // 3 days from now
      notes: null, createdBy: 1, createdAt: new Date(), updatedAt: new Date(),
    },
    {
      id: 2, code: "PF-2026-002", clientId: 1, clientName: "Dr. Carlos", clientClinic: "OdontoVida",
      orderNumber: 1051, patientName: "João Santos",
      serviceName: "Prótese Total", tooth: null, status: "in_production",
      progress: 30, price: "1200.00",
      deadline: new Date(Date.now() + 1 * 86400000), // 1 day from now
      notes: null, createdBy: 1, createdAt: new Date(), updatedAt: new Date(),
    },
    {
      id: 3, code: "PF-2026-003", clientId: 1, clientName: "Dr. Carlos", clientClinic: "OdontoVida",
      orderNumber: 1052, patientName: null,
      serviceName: "Faceta", tooth: "11", status: "ready",
      progress: 90, price: "500.00",
      deadline: new Date(Date.now() - 1 * 86400000), // overdue
      notes: null, createdBy: 1, createdAt: new Date(), updatedAt: new Date(),
    },
    {
      id: 4, code: "PF-2026-004", clientId: 1, clientName: "Dr. Carlos", clientClinic: "OdontoVida",
      orderNumber: 1053, patientName: null,
      serviceName: "Inlay", tooth: "26", status: "delivered",
      progress: 100, price: "280.00",
      deadline: new Date(Date.now() - 5 * 86400000),
      deliveredAt: new Date(Date.now() - 3 * 86400000),
      notes: null, createdBy: 1, createdAt: new Date(), updatedAt: new Date(),
    },
  ]),
  getJob: vi.fn(),
  createJob: vi.fn().mockResolvedValue({ id: 1 }),
  updateJob: vi.fn().mockResolvedValue(undefined),
  deleteJob: vi.fn(),
  generateJobCode: vi.fn().mockResolvedValue("PF-2026-001"),
  getDashboardStats: vi.fn().mockResolvedValue({
    totalJobs: 12, totalClients: 8, todayDeliveries: 3, monthlyRevenue: "42500", overdueJobs: 1,
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
}));

vi.mock("./db.jobLogs", () => ({
  createJobLog: vi.fn().mockResolvedValue(undefined),
  getJobLogs: vi.fn().mockResolvedValue([]),
  getKanbanMetrics: vi.fn().mockResolvedValue({ avgTimeByStatus: [], totalMovements: 0 }),
  listActiveUsers: vi.fn().mockResolvedValue([
    { id: 1, name: "Patricia Lima", email: "patricia@test.com", role: "admin" },
    { id: 2, name: "João Silva", email: "joao@test.com", role: "user" },
  ]),
  assignJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./db.stock", () => ({
  getStockSummary: vi.fn().mockResolvedValue({ totalMaterials: 0, lowStockCount: 0, totalValue: 0 }),
  getLowStockMaterials: vi.fn().mockResolvedValue([]),
}));

vi.mock("./db.reports", () => ({
  getReportsSummary: vi.fn().mockResolvedValue(null),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Resposta da Flow IA." } }],
  }),
}));

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

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════
// Kanban: getBoard
// ═══════════════════════════════════════════════════════════

describe("kanban.getBoard", () => {
  it("returns columns grouped by status", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.kanban.getBoard();

    expect(result).toHaveProperty("columns");
    expect(result).toHaveProperty("totalCount");
    expect(result).toHaveProperty("statuses");

    // Should have all 5 columns
    expect(Object.keys(result.columns)).toEqual(
      expect.arrayContaining(["waiting", "in_production", "review", "ready", "delivered"])
    );

    // Jobs should be distributed correctly
    expect(result.columns.waiting).toHaveLength(1);
    expect(result.columns.waiting[0].code).toBe("PF-2026-001");
    expect(result.columns.in_production).toHaveLength(1);
    expect(result.columns.in_production[0].code).toBe("PF-2026-002");
    expect(result.columns.ready).toHaveLength(1);
    expect(result.columns.ready[0].code).toBe("PF-2026-003");
    expect(result.columns.delivered).toHaveLength(1);
    expect(result.columns.delivered[0].code).toBe("PF-2026-004");
    expect(result.columns.review).toHaveLength(0);

    expect(result.totalCount).toBe(4);
  });

  it("filters by clientId when provided", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.kanban.getBoard({ clientId: 1 });

    // All mock jobs have clientId 1, so all should be returned
    expect(result.totalCount).toBe(4);
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.kanban.getBoard()).rejects.toThrow();
  });

  it("collaborators can access the board", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    const result = await caller.kanban.getBoard();
    expect(result).toHaveProperty("columns");
    expect(result.totalCount).toBe(4);
  });
});

// ═══════════════════════════════════════════════════════════
// Kanban: moveJob
// ═══════════════════════════════════════════════════════════

describe("kanban.moveJob", () => {
  it("moves a job from waiting to in_production", async () => {
    const db = await import("./db");
    (db.getJob as any).mockResolvedValueOnce({
      id: 1, code: "PF-2026-001", status: "waiting", serviceName: "Coroa",
      price: "350.00", progress: 0,
    });

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.kanban.moveJob({
      jobId: 1,
      newStatus: "in_production",
    });

    expect(result.success).toBe(true);
    expect(result.previousStatus).toBe("waiting");
    expect(result.newStatus).toBe("in_production");
    expect(db.updateJob).toHaveBeenCalledWith(1, expect.objectContaining({
      status: "in_production",
      progress: 30,
    }));
    expect(db.createNotification).toHaveBeenCalled();
  });

  it("moves a job to delivered and creates receivable", async () => {
    const db = await import("./db");
    (db.getJob as any).mockResolvedValueOnce({
      id: 3, code: "PF-2026-003", status: "ready", serviceName: "Faceta",
      price: "500.00", progress: 90,
    });

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.kanban.moveJob({
      jobId: 3,
      newStatus: "delivered",
    });

    expect(result.success).toBe(true);
    expect(result.newStatus).toBe("delivered");
    expect(db.updateJob).toHaveBeenCalledWith(3, expect.objectContaining({
      status: "delivered",
      progress: 100,
    }));
    expect(db.autoCreateReceivableForJob).toHaveBeenCalledWith(3);
  });

  it("rejects invalid transitions (waiting → delivered)", async () => {
    const db = await import("./db");
    (db.getJob as any).mockResolvedValueOnce({
      id: 1, code: "PF-2026-001", status: "waiting", serviceName: "Coroa",
      price: "350.00", progress: 0,
    });

    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.kanban.moveJob({ jobId: 1, newStatus: "delivered" })
    ).rejects.toThrow(/Transição inválida/);
  });

  it("rejects invalid transitions (waiting → ready)", async () => {
    const db = await import("./db");
    (db.getJob as any).mockResolvedValueOnce({
      id: 1, code: "PF-2026-001", status: "waiting", serviceName: "Coroa",
      price: "350.00", progress: 0,
    });

    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.kanban.moveJob({ jobId: 1, newStatus: "ready" })
    ).rejects.toThrow(/Transição inválida/);
  });

  it("throws when job not found", async () => {
    const db = await import("./db");
    (db.getJob as any).mockResolvedValueOnce(null);

    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.kanban.moveJob({ jobId: 999, newStatus: "in_production" })
    ).rejects.toThrow(/não encontrado/);
  });

  it("requires authentication to move jobs", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(
      caller.kanban.moveJob({ jobId: 1, newStatus: "in_production" })
    ).rejects.toThrow();
  });

  it("collaborators can move jobs", async () => {
    const db = await import("./db");
    (db.getJob as any).mockResolvedValueOnce({
      id: 2, code: "PF-2026-002", status: "in_production", serviceName: "Prótese",
      price: "1200.00", progress: 30,
    });

    const caller = appRouter.createCaller(createCollaboratorContext());
    const result = await caller.kanban.moveJob({
      jobId: 2,
      newStatus: "review",
    });
    expect(result.success).toBe(true);
    expect(result.newStatus).toBe("review");
  });
});

// ═══════════════════════════════════════════════════════════
// Kanban: getValidTransitions
// ═══════════════════════════════════════════════════════════

describe("kanban.getValidTransitions", () => {
  it("returns valid transitions for waiting status", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.kanban.getValidTransitions({ status: "waiting" });
    expect(result).toEqual(expect.arrayContaining(["in_production", "review"]));
    expect(result).not.toContain("delivered");
    expect(result).not.toContain("ready");
  });

  it("returns valid transitions for in_production status", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.kanban.getValidTransitions({ status: "in_production" });
    expect(result).toEqual(expect.arrayContaining(["review", "ready", "waiting"]));
  });

  it("returns valid transitions for ready status", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.kanban.getValidTransitions({ status: "ready" });
    expect(result).toContain("delivered");
  });

  it("returns valid transitions for delivered status (can revert)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.kanban.getValidTransitions({ status: "delivered" });
    expect(result).toEqual(expect.arrayContaining(["ready", "in_production"]));
  });

  it("returns empty array for unknown status", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.kanban.getValidTransitions({ status: "nonexistent" });
    expect(result).toEqual([]);
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(
      caller.kanban.getValidTransitions({ status: "waiting" })
    ).rejects.toThrow();
  });
});
