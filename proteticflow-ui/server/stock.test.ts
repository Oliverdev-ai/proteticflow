/**
 * Stock Router Tests — ProteticFlow
 * Testes para o Módulo de Estoque:
 * categories, suppliers, materials, movements + alertas automáticos
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
  getClient: vi.fn(),
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
  updateJob: vi.fn(),
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
  getAllActiveUserIds: vi.fn().mockResolvedValue([1, 2]),
  hasDeadlineNotification: vi.fn().mockResolvedValue(false),
  logDeadlineNotification: vi.fn(),
}));

// ─── Mock db.stock module ──────────────────────────────────
vi.mock("./db.stock", () => ({
  listMaterialCategories: vi.fn().mockResolvedValue([
    { id: 1, name: "Resinas", description: "Materiais resinosos", color: "amber", createdAt: new Date() },
    { id: 2, name: "Metais", description: "Ligas metálicas", color: "slate", createdAt: new Date() },
  ]),
  createMaterialCategory: vi.fn().mockResolvedValue({ id: 3 }),
  updateMaterialCategory: vi.fn().mockResolvedValue(undefined),
  deleteMaterialCategory: vi.fn().mockResolvedValue(undefined),

  listSuppliers: vi.fn().mockResolvedValue([
    { id: 1, name: "DentalSupply", contact: "João", email: "joao@dental.com", phone: "11999999999", address: "SP", notes: null, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getSupplier: vi.fn().mockResolvedValue({ id: 1, name: "DentalSupply" }),
  createSupplier: vi.fn().mockResolvedValue({ id: 2 }),
  updateSupplier: vi.fn().mockResolvedValue(undefined),
  deactivateSupplier: vi.fn().mockResolvedValue(undefined),

  listMaterials: vi.fn().mockResolvedValue([
    {
      id: 1, name: "Resina Acrílica Incolor", unit: "kg", categoryId: 1, categoryName: "Resinas",
      categoryColor: "amber", supplierId: 1, supplierName: "DentalSupply",
      currentStock: "2.500", minStock: "1.000", maxStock: "10.000",
      costPrice: "45.00", notes: null, isActive: true, createdAt: new Date(), updatedAt: new Date(),
    },
    {
      id: 2, name: "Liga Metálica Cr-Co", unit: "g", categoryId: 2, categoryName: "Metais",
      categoryColor: "slate", supplierId: 1, supplierName: "DentalSupply",
      currentStock: "50.000", minStock: "100.000", maxStock: "500.000",
      costPrice: "0.85", notes: null, isActive: true, createdAt: new Date(), updatedAt: new Date(),
    },
  ]),
  getMaterial: vi.fn().mockResolvedValue({
    id: 1, name: "Resina Acrílica Incolor", unit: "kg",
    currentStock: "2.500", minStock: "1.000", maxStock: "10.000",
    costPrice: "45.00", isActive: true, categoryId: 1, categoryName: "Resinas",
    supplierId: 1, supplierName: "DentalSupply", createdAt: new Date(), updatedAt: new Date(),
  }),
  createMaterial: vi.fn().mockResolvedValue({ id: 3 }),
  updateMaterial: vi.fn().mockResolvedValue(undefined),
  deactivateMaterial: vi.fn().mockResolvedValue(undefined),
  getLowStockMaterials: vi.fn().mockResolvedValue([
    {
      id: 2, name: "Liga Metálica Cr-Co", unit: "g",
      currentStock: "50.000", minStock: "100.000",
      categoryName: "Metais", supplierName: "DentalSupply", supplierPhone: "11999999999",
    },
  ]),
  getStockSummary: vi.fn().mockResolvedValue({
    totalMaterials: 2, lowStockCount: 1, totalValue: 155.25, categories: 2,
  }),

  listStockMovements: vi.fn().mockResolvedValue([
    {
      id: 1, materialId: 1, materialName: "Resina Acrílica Incolor", materialUnit: "kg",
      type: "in", quantity: "5.000", stockAfter: "7.500",
      reason: "Compra mensal", jobId: null, invoiceNumber: "NF-001",
      unitCost: "45.00", notes: null, createdBy: 1, createdAt: new Date(),
    },
  ]),
  registerMovement: vi.fn().mockResolvedValue({
    id: 2, stockAfter: 7.5, isLow: false, materialName: "Resina Acrílica Incolor", minStock: 1.0,
  }),
  getStockConsumptionReport: vi.fn().mockResolvedValue([
    { materialId: 1, materialName: "Resina Acrílica Incolor", unit: "kg", categoryName: "Resinas", totalOut: "2.500", totalIn: "5.000", movementCount: 3 },
  ]),
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

// ─── Context helpers ───────────────────────────────────────
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1, openId: "admin-openid", email: "patricia@proteticflow.com",
    name: "Patricia Lima", loginMethod: "manus", role: "admin",
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    isActive: true,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createCollaboratorContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2, openId: "colab-openid", email: "joao@proteticflow.com",
    name: "João Silva", loginMethod: "manus", role: "user",
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    isActive: true,
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
// Categories
// ═══════════════════════════════════════════════════════════

describe("stock.categories.list", () => {
  it("returns all categories for authenticated user", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.stock.categories.list();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Resinas");
    expect(result[1].name).toBe("Metais");
  });

  it("collaborator can list categories", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    const result = await caller.stock.categories.list();
    expect(result).toHaveLength(2);
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.stock.categories.list()).rejects.toThrow();
  });
});

describe("stock.categories.create", () => {
  it("admin can create a category", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.stock.categories.create({
      name: "Cerâmicas",
      description: "Materiais cerâmicos",
      color: "blue",
    });
    expect(result.id).toBe(3);
  });

  it("collaborator cannot create a category (RBAC)", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(
      caller.stock.categories.create({ name: "Cerâmicas" })
    ).rejects.toThrow();
  });

  it("validates required name", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.stock.categories.create({ name: "" })
    ).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// Suppliers
// ═══════════════════════════════════════════════════════════

describe("stock.suppliers.list", () => {
  it("returns active suppliers", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.stock.suppliers.list();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("DentalSupply");
  });

  it("collaborator can list suppliers", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    const result = await caller.stock.suppliers.list();
    expect(result).toHaveLength(1);
  });
});

describe("stock.suppliers.create", () => {
  it("admin can create a supplier", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.stock.suppliers.create({
      name: "OdontoImport",
      contact: "Maria",
      phone: "11888888888",
    });
    expect(result.id).toBe(2);
  });

  it("collaborator cannot create supplier (RBAC)", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(
      caller.stock.suppliers.create({ name: "OdontoImport" })
    ).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════
// Materials
// ═══════════════════════════════════════════════════════════

describe("stock.materials.list", () => {
  it("returns all active materials", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.stock.materials.list();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Resina Acrílica Incolor");
  });

  it("supports search filter", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.stock.materials.list({ search: "resina" });
    const stockDbMock = await import("./db.stock");
    expect(stockDbMock.listMaterials).toHaveBeenCalledWith(
      expect.objectContaining({ search: "resina" })
    );
  });

  it("supports lowStockOnly filter", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.stock.materials.list({ lowStockOnly: true });
    const stockDbMock = await import("./db.stock");
    expect(stockDbMock.listMaterials).toHaveBeenCalledWith(
      expect.objectContaining({ lowStockOnly: true })
    );
  });

  it("collaborator can list materials", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    const result = await caller.stock.materials.list();
    expect(result).toHaveLength(2);
  });
});

describe("stock.materials.get", () => {
  it("returns a specific material by id", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.stock.materials.get({ id: 1 });
    expect(result.name).toBe("Resina Acrílica Incolor");
    expect(result.unit).toBe("kg");
  });
});

describe("stock.materials.create", () => {
  it("admin can create a material", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.stock.materials.create({
      name: "Gesso Tipo IV",
      unit: "kg",
      minStock: "2",
      costPrice: "12.50",
    });
    expect(result.id).toBe(3);
  });

  it("collaborator cannot create material (RBAC)", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    await expect(
      caller.stock.materials.create({ name: "Gesso", unit: "kg" })
    ).rejects.toThrow();
  });

  it("validates required name", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.stock.materials.create({ name: "", unit: "kg" })
    ).rejects.toThrow();
  });
});

describe("stock.materials.lowStock", () => {
  it("returns materials below minimum stock", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.stock.materials.lowStock();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Liga Metálica Cr-Co");
  });

  it("collaborator can check low stock", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    const result = await caller.stock.materials.lowStock();
    expect(result).toHaveLength(1);
  });
});

describe("stock.materials.summary", () => {
  it("returns stock summary with totals", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.stock.materials.summary();
    expect(result.totalMaterials).toBe(2);
    expect(result.lowStockCount).toBe(1);
    expect(result.totalValue).toBe(155.25);
    expect(result.categories).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════
// Movements
// ═══════════════════════════════════════════════════════════

describe("stock.movements.list", () => {
  it("returns movement history", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.stock.movements.list();
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("in");
    expect(result[0].materialName).toBe("Resina Acrílica Incolor");
  });

  it("collaborator can list movements", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    const result = await caller.stock.movements.list();
    expect(result).toHaveLength(1);
  });
});

describe("stock.movements.register", () => {
  it("admin can register an entry (in)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.stock.movements.register({
      materialId: 1,
      type: "in",
      quantity: "5",
      reason: "Compra mensal",
      invoiceNumber: "NF-002",
    });
    expect(result.success).toBe(true);
    expect(result.materialName).toBe("Resina Acrílica Incolor");
    expect(result.isLow).toBe(false);
  });

  it("collaborator can register movements", async () => {
    const caller = appRouter.createCaller(createCollaboratorContext());
    const result = await caller.stock.movements.register({
      materialId: 1,
      type: "out",
      quantity: "0.5",
      reason: "Uso na OS 1250",
    });
    expect(result.success).toBe(true);
  });

  it("triggers low stock alert notification when stock falls below minimum", async () => {
    const stockDbMock = await import("./db.stock");
    (stockDbMock.registerMovement as any).mockResolvedValueOnce({
      id: 5, stockAfter: 0.5, isLow: true,
      materialName: "Liga Metálica Cr-Co", minStock: 100.0,
    });

    const dbMock = await import("./db");
    const caller = appRouter.createCaller(createAdminContext());
    await caller.stock.movements.register({
      materialId: 2,
      type: "out",
      quantity: "49.5",
      reason: "Uso em prótese",
    });

    // Should create notifications for all active users
    expect(dbMock.createNotification).toHaveBeenCalledTimes(2); // 2 active users
    expect(dbMock.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "warning",
        title: expect.stringContaining("Estoque baixo"),
      })
    );
  });

  it("validates quantity must be positive", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.stock.movements.register({
        materialId: 1,
        type: "in",
        quantity: "0",
      })
    ).rejects.toThrow();
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(
      caller.stock.movements.register({
        materialId: 1,
        type: "in",
        quantity: "5",
      })
    ).rejects.toThrow();
  });
});

describe("stock.movements.consumptionReport", () => {
  it("returns consumption report for a period", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const startDate = new Date("2026-03-01");
    const endDate = new Date("2026-03-31");
    const result = await caller.stock.movements.consumptionReport({ startDate, endDate });
    expect(result).toHaveLength(1);
    expect(result[0].materialName).toBe("Resina Acrílica Incolor");
    expect(result[0].totalOut).toBe("2.500");
  });
});
