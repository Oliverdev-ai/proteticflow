/**
 * pushNotifications.test.ts — Testes do módulo de Push Notifications
 * Testa: getVapidPublicKey, subscribe, unsubscribe, getStatus, testPush, broadcast
 * Padrão: appRouter.createCaller + mocks de db.push e push helper
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("./db.push", () => ({
  upsertPushSubscription: vi.fn(),
  deletePushSubscription: vi.fn(),
  getUserPushSubscriptions: vi.fn(),
  getAllPushSubscriptions: vi.fn(),
  deleteExpiredSubscription: vi.fn(),
  touchPushSubscription: vi.fn(),
}));

vi.mock("./push", () => ({
  isVapidConfigured: vi.fn(),
  sendPushToSubscription: vi.fn(),
  sendPushToUser: vi.fn(),
  broadcastPush: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  getAllActiveUserIds: vi.fn().mockResolvedValue([1]),
  createNotification: vi.fn(),
  getJobsApproachingDeadline: vi.fn().mockResolvedValue([]),
  hasDeadlineNotification: vi.fn().mockResolvedValue(false),
  logDeadlineNotification: vi.fn(),
}));

vi.mock("./db.stock", () => ({
  getStockSummary: vi.fn().mockResolvedValue({ totalMaterials: 0, lowStock: 0, totalValue: 0, topConsumed: "N/A" }),
}));

vi.mock("./db.jobLogs", () => ({
  getKanbanMetrics: vi.fn().mockResolvedValue({ avgTimePerStatus: {} }),
  listActiveUsers: vi.fn().mockResolvedValue([]),
}));

vi.mock("./db.reports", () => ({
  getReportsSummary: vi.fn().mockResolvedValue({
    production: { totalJobs: 0, delivered: 0, overdue: 0, topService: "N/A" },
    financial: { totalRevenue: 0, received: 0, pending: 0, netResult: 0 },
    stock: { totalMaterials: 0, lowStock: 0, totalValue: 0, topConsumed: "N/A" },
  }),
}));

vi.mock("./db.predictions", () => ({
  getPrediction: vi.fn().mockResolvedValue({
    nextMonthEstimate: 0,
    confidence: "low",
    factors: [],
  }),
}));

vi.mock("./db.labSettings", () => ({
  getLabSettings: vi.fn().mockResolvedValue(null),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Test response" } }],
  }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

import * as pushDb from "./db.push";
import * as pushHelper from "./push";

const mockUpsert = vi.mocked(pushDb.upsertPushSubscription);
const mockDelete = vi.mocked(pushDb.deletePushSubscription);
const mockGetUserSubs = vi.mocked(pushDb.getUserPushSubscriptions);
const mockIsVapidConfigured = vi.mocked(pushHelper.isVapidConfigured);
const mockSendToUser = vi.mocked(pushHelper.sendPushToUser);
const mockBroadcast = vi.mocked(pushHelper.broadcastPush);

const VALID_SUBSCRIPTION = {
  endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint",
  keys: {
    p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlTiESgX776I0w6kLy2hQzoFJxAkSUPS7jkFo0bFA",
    auth: "tBHItJI5svbpez7KI4CCXg",
  },
};

function makeAdminCaller() {
  return appRouter.createCaller({
    user: { id: 1, email: "admin@test.com", name: "Admin", role: "admin" },
    res: {} as any,
  });
}

function makeUserCaller() {
  return appRouter.createCaller({
    user: { id: 2, email: "user@test.com", name: "User", role: "user" },
    res: {} as any,
  });
}

function makeAnonCaller() {
  return appRouter.createCaller({
    user: null,
    res: {} as any,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("push.getVapidPublicKey", () => {
  it("retorna publicKey e isConfigured=true quando VAPID está configurado", async () => {
    mockIsVapidConfigured.mockReturnValue(true);
    const caller = makeAdminCaller();
    const result = await caller.push.getVapidPublicKey();
    expect(result.isConfigured).toBe(true);
  });

  it("retorna isConfigured=false quando VAPID não está configurado", async () => {
    mockIsVapidConfigured.mockReturnValue(false);
    const caller = makeAdminCaller();
    const result = await caller.push.getVapidPublicKey();
    expect(result.isConfigured).toBe(false);
  });

  it("rejeita acesso anônimo", async () => {
    const caller = makeAnonCaller();
    await expect(caller.push.getVapidPublicKey()).rejects.toThrow();
  });
});

describe("push.subscribe", () => {
  beforeEach(() => {
    mockIsVapidConfigured.mockReturnValue(true);
    mockUpsert.mockResolvedValue({ id: 1, userId: 1, endpoint: VALID_SUBSCRIPTION.endpoint } as any);
  });

  it("registra subscription com sucesso", async () => {
    const caller = makeUserCaller();
    const result = await caller.push.subscribe({
      subscription: VALID_SUBSCRIPTION,
      userAgent: "Mozilla/5.0",
    });
    expect(result.success).toBe(true);
    expect(result.subscriptionId).toBe(1);
    expect(mockUpsert).toHaveBeenCalledWith(2, VALID_SUBSCRIPTION, "Mozilla/5.0");
  });

  it("lança PRECONDITION_FAILED quando VAPID não está configurado", async () => {
    mockIsVapidConfigured.mockReturnValue(false);
    const caller = makeUserCaller();
    await expect(
      caller.push.subscribe({ subscription: VALID_SUBSCRIPTION })
    ).rejects.toThrow("Push notifications não configuradas");
  });

  it("lança INTERNAL_SERVER_ERROR quando upsert retorna null", async () => {
    mockUpsert.mockResolvedValue(null);
    const caller = makeUserCaller();
    await expect(
      caller.push.subscribe({ subscription: VALID_SUBSCRIPTION })
    ).rejects.toThrow("Erro ao salvar subscription");
  });

  it("rejeita endpoint inválido (não URL)", async () => {
    const caller = makeUserCaller();
    await expect(
      caller.push.subscribe({
        subscription: { ...VALID_SUBSCRIPTION, endpoint: "not-a-url" },
      })
    ).rejects.toThrow();
  });

  it("rejeita acesso anônimo", async () => {
    const caller = makeAnonCaller();
    await expect(
      caller.push.subscribe({ subscription: VALID_SUBSCRIPTION })
    ).rejects.toThrow();
  });
});

describe("push.unsubscribe", () => {
  it("remove subscription com sucesso", async () => {
    mockDelete.mockResolvedValue(true);
    const caller = makeUserCaller();
    const result = await caller.push.unsubscribe({
      endpoint: VALID_SUBSCRIPTION.endpoint,
    });
    expect(result.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith(2, VALID_SUBSCRIPTION.endpoint);
  });

  it("rejeita endpoint inválido", async () => {
    const caller = makeUserCaller();
    await expect(
      caller.push.unsubscribe({ endpoint: "invalid" })
    ).rejects.toThrow();
  });
});

describe("push.getStatus", () => {
  it("retorna subscriptions ativas do usuário", async () => {
    mockIsVapidConfigured.mockReturnValue(true);
    mockGetUserSubs.mockResolvedValue([
      {
        id: 1,
        userId: 2,
        endpoint: VALID_SUBSCRIPTION.endpoint,
        p256dh: VALID_SUBSCRIPTION.keys.p256dh,
        auth: VALID_SUBSCRIPTION.keys.auth,
        userAgent: "Chrome",
        createdAt: new Date(),
        lastUsedAt: new Date(),
      },
    ]);
    const caller = makeUserCaller();
    const result = await caller.push.getStatus();
    expect(result.activeSubscriptions).toBe(1);
    expect(result.isConfigured).toBe(true);
    expect(result.devices).toHaveLength(1);
  });

  it("retorna 0 subscriptions quando não há nenhuma", async () => {
    mockGetUserSubs.mockResolvedValue([]);
    const caller = makeUserCaller();
    const result = await caller.push.getStatus();
    expect(result.activeSubscriptions).toBe(0);
  });
});

describe("push.testPush", () => {
  it("envia notificação de teste com sucesso", async () => {
    mockIsVapidConfigured.mockReturnValue(true);
    mockSendToUser.mockResolvedValue(1);
    const caller = makeUserCaller();
    const result = await caller.push.testPush();
    expect(result.success).toBe(true);
    expect(result.sent).toBe(1);
  });

  it("lança NOT_FOUND quando não há subscriptions ativas", async () => {
    mockIsVapidConfigured.mockReturnValue(true);
    mockSendToUser.mockResolvedValue(0);
    const caller = makeUserCaller();
    await expect(caller.push.testPush()).rejects.toThrow("Nenhuma subscription ativa");
  });

  it("lança PRECONDITION_FAILED quando VAPID não está configurado", async () => {
    mockIsVapidConfigured.mockReturnValue(false);
    const caller = makeUserCaller();
    await expect(caller.push.testPush()).rejects.toThrow("Push notifications não configuradas");
  });
});

describe("push.broadcast (admin only)", () => {
  it("admin pode fazer broadcast com sucesso", async () => {
    mockIsVapidConfigured.mockReturnValue(true);
    mockBroadcast.mockResolvedValue({ sent: 5, failed: 0, total: 5 });
    const caller = makeAdminCaller();
    const result = await caller.push.broadcast({
      title: "Aviso importante",
      body: "Mensagem de teste para todos os usuários",
    });
    expect(result.sent).toBe(5);
    expect(result.total).toBe(5);
  });

  it("colaborador não pode fazer broadcast", async () => {
    const caller = makeUserCaller();
    await expect(
      caller.push.broadcast({
        title: "Aviso",
        body: "Mensagem",
      })
    ).rejects.toThrow();
  });

  it("lança PRECONDITION_FAILED quando VAPID não está configurado", async () => {
    mockIsVapidConfigured.mockReturnValue(false);
    const caller = makeAdminCaller();
    await expect(
      caller.push.broadcast({ title: "Aviso", body: "Mensagem" })
    ).rejects.toThrow("Push notifications não configuradas");
  });

  it("valida título obrigatório", async () => {
    mockIsVapidConfigured.mockReturnValue(true);
    const caller = makeAdminCaller();
    await expect(
      caller.push.broadcast({ title: "", body: "Mensagem" })
    ).rejects.toThrow();
  });

  it("valida body obrigatório", async () => {
    mockIsVapidConfigured.mockReturnValue(true);
    const caller = makeAdminCaller();
    await expect(
      caller.push.broadcast({ title: "Aviso", body: "" })
    ).rejects.toThrow();
  });
});
