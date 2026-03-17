import { eq, desc, sql, and, like, or, count, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, User,
  InsertClient, clients, Client,
  InsertPriceItem, priceItems, PriceItem,
  InsertJob, jobs, Job,
  InsertNotification, notifications,
  InsertChatMessage, chatMessages,
  InsertInvite, invites, Invite,
  deadlineNotifLog,
} from "../drizzle/schema";
import { nanoid } from "nanoid";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ──────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Clients ────────────────────────────────────────────────

export async function listClients(search?: string, status?: string) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(clients);
  const conditions = [];
  if (status && status !== "all") conditions.push(eq(clients.status, status as "active" | "inactive"));
  if (search) {
    conditions.push(or(
      like(clients.name, `%${search}%`),
      like(clients.clinic, `%${search}%`),
      like(clients.city, `%${search}%`)
    )!);
  }
  if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
  return query.orderBy(desc(clients.updatedAt));
}

export async function getClient(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result[0];
}

export async function createClient(data: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clients).values(data);
  return { id: result[0].insertId };
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set(data).where(eq(clients.id, id));
}

export async function deleteClient(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(clients).where(eq(clients.id, id));
}

// ─── Price Items ────────────────────────────────────────────

export async function listPriceItems(search?: string) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(priceItems).where(eq(priceItems.isActive, true));
  if (search) {
    query = db.select().from(priceItems).where(
      and(
        eq(priceItems.isActive, true),
        or(like(priceItems.name, `%${search}%`), like(priceItems.material, `%${search}%`))!
      )
    ) as typeof query;
  }
  return query.orderBy(priceItems.category, priceItems.name);
}

export async function createPriceItem(data: InsertPriceItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(priceItems).values(data);
  return { id: result[0].insertId };
}

export async function updatePriceItem(id: number, data: Partial<InsertPriceItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(priceItems).set(data).where(eq(priceItems.id, id));
}

export async function deletePriceItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(priceItems).set({ isActive: false }).where(eq(priceItems.id, id));
}

// ─── Jobs ───────────────────────────────────────────────────

export async function listJobs(search?: string, status?: string) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      id: jobs.id,
      code: jobs.code,
      orderNumber: jobs.orderNumber,
      patientName: jobs.patientName,
      clientId: jobs.clientId,
      clientName: clients.name,
      clientClinic: clients.clinic,
      priceItemId: jobs.priceItemId,
      serviceName: jobs.serviceName,
      tooth: jobs.tooth,
      status: jobs.status,
      progress: jobs.progress,
      price: jobs.price,
      deadline: jobs.deadline,
      notes: jobs.notes,
      createdBy: jobs.createdBy,
      createdAt: jobs.createdAt,
      updatedAt: jobs.updatedAt,
    })
    .from(jobs)
    .leftJoin(clients, eq(jobs.clientId, clients.id))
    .orderBy(desc(jobs.updatedAt));

  let filtered = result;
  if (status && status !== "all") filtered = filtered.filter(j => j.status === status);
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(j =>
      j.code.toLowerCase().includes(s) ||
      (j.clientName && j.clientName.toLowerCase().includes(s)) ||
      j.serviceName.toLowerCase().includes(s)
    );
  }
  return filtered;
}

export async function getJob(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({
      id: jobs.id, code: jobs.code, orderNumber: jobs.orderNumber, patientName: jobs.patientName,
      clientId: jobs.clientId, clientName: clients.name, clientClinic: clients.clinic,
      priceItemId: jobs.priceItemId, serviceName: jobs.serviceName,
      tooth: jobs.tooth, status: jobs.status, progress: jobs.progress,
      price: jobs.price, deadline: jobs.deadline, notes: jobs.notes,
      createdBy: jobs.createdBy, createdAt: jobs.createdAt, updatedAt: jobs.updatedAt,
    })
    .from(jobs)
    .leftJoin(clients, eq(jobs.clientId, clients.id))
    .where(eq(jobs.id, id))
    .limit(1);
  return result[0];
}

export async function createJob(data: InsertJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(jobs).values(data);
  // Update client totalJobs and totalRevenue
  await db.update(clients).set({
    totalJobs: sql`${clients.totalJobs} + 1`,
    totalRevenue: sql`${clients.totalRevenue} + ${data.price}`,
  }).where(eq(clients.id, data.clientId));
  return { id: result[0].insertId };
}

export async function updateJob(id: number, data: Partial<InsertJob>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(jobs).set(data).where(eq(jobs.id, id));
}

export async function deleteJob(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(jobs).where(eq(jobs.id, id));
}

export async function generateJobCode() {
  const db = await getDb();
  if (!db) return `PF-${Date.now()}`;
  const year = new Date().getFullYear();
  const result = await db.select({ cnt: count() }).from(jobs);
  const num = (result[0]?.cnt ?? 0) + 1;
  return `PF-${year}-${String(num).padStart(3, "0")}`;
}

// ─── Dashboard Stats ────────────────────────────────────────

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { totalJobs: 0, totalClients: 0, todayDeliveries: 0, monthlyRevenue: "0", overdueJobs: 0 };

  const [jobCount] = await db.select({ cnt: count() }).from(jobs).where(
    or(
      eq(jobs.status, "waiting"),
      eq(jobs.status, "in_production"),
      eq(jobs.status, "review"),
      eq(jobs.status, "ready")
    )
  );
  const [clientCount] = await db.select({ cnt: count() }).from(clients).where(eq(clients.status, "active"));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayDel] = await db.select({ cnt: count() }).from(jobs).where(
    and(
      sql`${jobs.deadline} >= ${today}`,
      sql`${jobs.deadline} < ${tomorrow}`
    )
  );

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [revenue] = await db.select({ total: sum(jobs.price) }).from(jobs).where(
    and(
      eq(jobs.status, "delivered"),
      sql`${jobs.updatedAt} >= ${monthStart}`
    )
  );

  const [overdue] = await db.select({ cnt: count() }).from(jobs).where(eq(jobs.status, "overdue"));

  return {
    totalJobs: jobCount?.cnt ?? 0,
    totalClients: clientCount?.cnt ?? 0,
    todayDeliveries: todayDel?.cnt ?? 0,
    monthlyRevenue: revenue?.total ?? "0",
    overdueJobs: overdue?.cnt ?? 0,
  };
}

// ─── Notifications ──────────────────────────────────────────

export async function listNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db.select({ cnt: count() }).from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result?.cnt ?? 0;
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: true })
    .where(eq(notifications.userId, userId));
}

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(notifications).values(data);
}

// ─── Chat Messages ──────────────────────────────────────────

export async function listChatMessages(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(chatMessages.createdAt)
    .limit(limit);
}

export async function saveChatMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(chatMessages).values(data);
}

// ─── User Management (Admin) ────────────────────────────────

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    openId: users.openId,
    name: users.name,
    email: users.email,
    phone: users.phone,
    role: users.role,
    isActive: users.isActive,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(id: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, id));
}

export async function deactivateUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ isActive: false }).where(eq(users.id, id));
}

export async function reactivateUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ isActive: true }).where(eq(users.id, id));
}

// ─── Invites ────────────────────────────────────────────────

export async function createInvite(data: { email: string; role: "user" | "admin"; invitedBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const token = nanoid(48);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
  const result = await db.insert(invites).values({
    email: data.email,
    role: data.role,
    token,
    invitedBy: data.invitedBy,
    expiresAt,
  });
  return { id: result[0].insertId, token };
}

export async function listInvites() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invites).orderBy(desc(invites.createdAt));
}

export async function revokeInvite(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(invites).set({ status: "expired" }).where(eq(invites.id, id));
}

export async function getInviteByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(invites).where(eq(invites.token, token)).limit(1);
  return result[0];
}

export async function acceptInvite(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(invites).set({ status: "accepted" }).where(eq(invites.token, token));
}

// ─── Deadline Notifications (24h auto) ──────────────────────

export async function getJobsApproachingDeadline() {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Get jobs with deadline in next 24h that are NOT delivered/overdue
  const result = await db
    .select({
      id: jobs.id,
      code: jobs.code,
      clientId: jobs.clientId,
      clientName: clients.name,
      serviceName: jobs.serviceName,
      status: jobs.status,
      deadline: jobs.deadline,
      createdBy: jobs.createdBy,
    })
    .from(jobs)
    .leftJoin(clients, eq(jobs.clientId, clients.id))
    .where(
      and(
        sql`${jobs.deadline} >= ${now}`,
        sql`${jobs.deadline} <= ${in24h}`,
        sql`${jobs.status} NOT IN ('delivered', 'overdue')`
      )
    );

  return result;
}

export async function hasDeadlineNotification(jobId: number) {
  const db = await getDb();
  if (!db) return true; // Fail safe: don't create duplicate

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await db.select({ cnt: count() }).from(deadlineNotifLog)
    .where(
      and(
        eq(deadlineNotifLog.jobId, jobId),
        sql`${deadlineNotifLog.notifiedAt} >= ${today}`
      )
    );
  return (result[0]?.cnt ?? 0) > 0;
}

export async function logDeadlineNotification(jobId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(deadlineNotifLog).values({ jobId });
}

export async function getAllActiveUserIds() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({ id: users.id }).from(users).where(eq(users.isActive, true));
  return result.map(u => u.id);
}

// ─── Order Blocks (Blocos de OS) ───────────────────────────

import {
  orderBlocks, InsertOrderBlock, OrderBlock,
  accountsReceivable, InsertAccountReceivable,
  financialClosings, InsertFinancialClosing,
  accountsPayable, InsertAccountPayable,
} from "../drizzle/schema";
import { gte, lte, between, ne, isNull, isNotNull, inArray, asc } from "drizzle-orm";

export async function listOrderBlocks(clientId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (clientId) {
    return db.select().from(orderBlocks)
      .where(and(eq(orderBlocks.clientId, clientId), eq(orderBlocks.isActive, true)))
      .orderBy(orderBlocks.blockStart);
  }
  // All blocks with client name
  const result = await db
    .select({
      id: orderBlocks.id,
      clientId: orderBlocks.clientId,
      clientName: clients.name,
      blockStart: orderBlocks.blockStart,
      blockEnd: orderBlocks.blockEnd,
      description: orderBlocks.description,
      isActive: orderBlocks.isActive,
      createdAt: orderBlocks.createdAt,
    })
    .from(orderBlocks)
    .leftJoin(clients, eq(orderBlocks.clientId, clients.id))
    .where(eq(orderBlocks.isActive, true))
    .orderBy(orderBlocks.blockStart);
  return result;
}

export async function createOrderBlock(data: InsertOrderBlock) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Validate no overlap with existing blocks
  const existing = await db.select().from(orderBlocks)
    .where(
      and(
        eq(orderBlocks.isActive, true),
        or(
          // New block starts inside existing block
          and(
            sql`${data.blockStart} >= ${orderBlocks.blockStart}`,
            sql`${data.blockStart} <= ${orderBlocks.blockEnd}`
          ),
          // New block ends inside existing block
          and(
            sql`${data.blockEnd} >= ${orderBlocks.blockStart}`,
            sql`${data.blockEnd} <= ${orderBlocks.blockEnd}`
          ),
          // New block encompasses existing block
          and(
            sql`${data.blockStart} <= ${orderBlocks.blockStart}`,
            sql`${data.blockEnd} >= ${orderBlocks.blockEnd}`
          )
        )!
      )
    );

  if (existing.length > 0) {
    throw new Error(`Conflito: o intervalo ${data.blockStart}-${data.blockEnd} sobrepõe um bloco existente (${existing[0].blockStart}-${existing[0].blockEnd}).`);
  }

  const result = await db.insert(orderBlocks).values(data);
  return { id: result[0].insertId };
}

export async function updateOrderBlock(id: number, data: Partial<InsertOrderBlock>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orderBlocks).set(data).where(eq(orderBlocks.id, id));
}

export async function deleteOrderBlock(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orderBlocks).set({ isActive: false }).where(eq(orderBlocks.id, id));
}

/**
 * Resolve client by order number.
 * Finds which client owns the block that contains the given order number.
 */
export async function resolveClientByOrderNumber(orderNumber: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select({
      blockId: orderBlocks.id,
      clientId: orderBlocks.clientId,
      clientName: clients.name,
      clientClinic: clients.clinic,
      blockStart: orderBlocks.blockStart,
      blockEnd: orderBlocks.blockEnd,
    })
    .from(orderBlocks)
    .leftJoin(clients, eq(orderBlocks.clientId, clients.id))
    .where(
      and(
        eq(orderBlocks.isActive, true),
        sql`${orderNumber} >= ${orderBlocks.blockStart}`,
        sql`${orderNumber} <= ${orderBlocks.blockEnd}`
      )
    )
    .limit(1);

  return result[0] || undefined;
}

/**
 * Find a job by its order number (OS number).
 */
export async function getJobByOrderNumber(orderNumber: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select({
      id: jobs.id,
      code: jobs.code,
      orderNumber: jobs.orderNumber,
      clientId: jobs.clientId,
      clientName: clients.name,
      serviceName: jobs.serviceName,
      patientName: jobs.patientName,
      tooth: jobs.tooth,
      status: jobs.status,
      progress: jobs.progress,
      price: jobs.price,
      deadline: jobs.deadline,
      deliveredAt: jobs.deliveredAt,
      notes: jobs.notes,
      createdAt: jobs.createdAt,
    })
    .from(jobs)
    .leftJoin(clients, eq(jobs.clientId, clients.id))
    .where(eq(jobs.orderNumber, orderNumber))
    .limit(1);

  return result[0] || undefined;
}

// ─── Accounts Receivable (Contas a Receber) ────────────────

export async function listAccountsReceivable(filters?: {
  clientId?: number;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      id: accountsReceivable.id,
      jobId: accountsReceivable.jobId,
      jobCode: jobs.code,
      jobOrderNumber: jobs.orderNumber,
      clientId: accountsReceivable.clientId,
      clientName: clients.name,
      amount: accountsReceivable.amount,
      description: accountsReceivable.description,
      dueDate: accountsReceivable.dueDate,
      paidAt: accountsReceivable.paidAt,
      status: accountsReceivable.status,
      notes: accountsReceivable.notes,
      createdAt: accountsReceivable.createdAt,
    })
    .from(accountsReceivable)
    .leftJoin(clients, eq(accountsReceivable.clientId, clients.id))
    .leftJoin(jobs, eq(accountsReceivable.jobId, jobs.id))
    .orderBy(desc(accountsReceivable.createdAt));

  let filtered = result;
  if (filters?.clientId) filtered = filtered.filter(r => r.clientId === filters.clientId);
  if (filters?.status && filters.status !== "all") filtered = filtered.filter(r => r.status === filters.status);
  if (filters?.startDate) filtered = filtered.filter(r => r.createdAt >= filters.startDate!);
  if (filters?.endDate) filtered = filtered.filter(r => r.createdAt <= filters.endDate!);
  return filtered;
}

export async function createAccountReceivable(data: InsertAccountReceivable) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(accountsReceivable).values(data);
  return { id: result[0].insertId };
}

export async function updateAccountReceivable(id: number, data: Partial<InsertAccountReceivable>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(accountsReceivable).set(data).where(eq(accountsReceivable.id, id));
}

export async function markAccountReceivablePaid(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(accountsReceivable).set({
    status: "paid",
    paidAt: new Date(),
  }).where(eq(accountsReceivable.id, id));
}

/**
 * Auto-create account receivable when a job is marked as "delivered".
 * Called from the jobs.update procedure.
 */
export async function autoCreateReceivableForJob(jobId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if already exists
  const existing = await db.select({ id: accountsReceivable.id })
    .from(accountsReceivable)
    .where(eq(accountsReceivable.jobId, jobId))
    .limit(1);

  if (existing.length > 0) return; // Already created

  // Get job details
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return;

  // Due date: 30 days from delivery
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  await db.insert(accountsReceivable).values({
    jobId: job.id,
    clientId: job.clientId,
    amount: job.price,
    description: `${job.serviceName} - OS ${job.orderNumber || job.code}`,
    dueDate,
    status: "pending",
  });
}

// ─── Financial Closings (Fechamento Mensal) ────────────────

export async function listFinancialClosings(clientId?: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      id: financialClosings.id,
      clientId: financialClosings.clientId,
      clientName: clients.name,
      period: financialClosings.period,
      totalJobs: financialClosings.totalJobs,
      totalAmount: financialClosings.totalAmount,
      paidAmount: financialClosings.paidAmount,
      pendingAmount: financialClosings.pendingAmount,
      status: financialClosings.status,
      closedAt: financialClosings.closedAt,
      notes: financialClosings.notes,
      createdAt: financialClosings.createdAt,
    })
    .from(financialClosings)
    .leftJoin(clients, eq(financialClosings.clientId, clients.id))
    .orderBy(desc(financialClosings.period));

  if (clientId) return result.filter(r => r.clientId === clientId);
  return result;
}

/**
 * Generate monthly closing for a specific client and period.
 * Sums all accounts receivable for the client in the given month.
 */
export async function generateMonthlyClosing(clientId: number, period: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if closing already exists
  const existing = await db.select().from(financialClosings)
    .where(and(
      eq(financialClosings.clientId, clientId),
      eq(financialClosings.period, period)
    ))
    .limit(1);

  if (existing.length > 0 && existing[0].status === "closed") {
    throw new Error(`Fechamento para o período ${period} já foi realizado e está fechado.`);
  }

  // Parse period "YYYY-MM" to date range
  const [year, month] = period.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Get all receivables for this client in the period
  const receivables = await db
    .select({
      id: accountsReceivable.id,
      amount: accountsReceivable.amount,
      status: accountsReceivable.status,
    })
    .from(accountsReceivable)
    .where(
      and(
        eq(accountsReceivable.clientId, clientId),
        sql`${accountsReceivable.createdAt} >= ${startDate}`,
        sql`${accountsReceivable.createdAt} <= ${endDate}`
      )
    );

  const totalJobs = receivables.length;
  const totalAmount = receivables.reduce((sum, r) => sum + parseFloat(r.amount), 0);
  const paidAmount = receivables
    .filter(r => r.status === "paid")
    .reduce((sum, r) => sum + parseFloat(r.amount), 0);
  const pendingAmount = totalAmount - paidAmount;

  if (existing.length > 0) {
    // Update existing closing
    await db.update(financialClosings).set({
      totalJobs,
      totalAmount: totalAmount.toFixed(2),
      paidAmount: paidAmount.toFixed(2),
      pendingAmount: pendingAmount.toFixed(2),
      status: "open",
    }).where(eq(financialClosings.id, existing[0].id));
    return { id: existing[0].id, totalJobs, totalAmount, paidAmount, pendingAmount };
  }

  // Create new closing
  const result = await db.insert(financialClosings).values({
    clientId,
    period,
    totalJobs,
    totalAmount: totalAmount.toFixed(2),
    paidAmount: paidAmount.toFixed(2),
    pendingAmount: pendingAmount.toFixed(2),
    status: "open",
  });

  return { id: result[0].insertId, totalJobs, totalAmount, paidAmount, pendingAmount };
}

export async function closeMonthlyClosing(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(financialClosings).set({
    status: "closed",
    closedAt: new Date(),
  }).where(eq(financialClosings.id, id));
}

export async function markClosingPaid(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(financialClosings).set({
    status: "paid",
  }).where(eq(financialClosings.id, id));
}

/**
 * Get client statement (extrato) for a date range.
 * Returns all jobs delivered and their receivable status.
 */
export async function getClientStatement(clientId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return { client: null, items: [], totals: { total: 0, paid: 0, pending: 0 } };

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client) return { client: null, items: [], totals: { total: 0, paid: 0, pending: 0 } };

  const items = await db
    .select({
      jobId: jobs.id,
      jobCode: jobs.code,
      orderNumber: jobs.orderNumber,
      serviceName: jobs.serviceName,
      patientName: jobs.patientName,
      tooth: jobs.tooth,
      price: jobs.price,
      deliveredAt: jobs.deliveredAt,
      createdAt: jobs.createdAt,
      arStatus: accountsReceivable.status,
      arPaidAt: accountsReceivable.paidAt,
    })
    .from(jobs)
    .leftJoin(accountsReceivable, eq(jobs.id, accountsReceivable.jobId))
    .where(
      and(
        eq(jobs.clientId, clientId),
        eq(jobs.status, "delivered"),
        sql`${jobs.createdAt} >= ${startDate}`,
        sql`${jobs.createdAt} <= ${endDate}`
      )
    )
    .orderBy(jobs.createdAt);

  const total = items.reduce((sum, i) => sum + parseFloat(i.price), 0);
  const paid = items.filter(i => i.arStatus === "paid").reduce((sum, i) => sum + parseFloat(i.price), 0);
  const pending = total - paid;

  return {
    client,
    items,
    totals: { total, paid, pending },
  };
}

// ─── Accounts Payable (Contas a Pagar) ─────────────────────

export async function listAccountsPayable(filters?: {
  status?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(accountsPayable)
    .orderBy(desc(accountsPayable.dueDate));

  let filtered = result;
  if (filters?.status && filters.status !== "all") filtered = filtered.filter(r => r.status === filters.status);
  if (filters?.startDate) filtered = filtered.filter(r => r.dueDate >= filters.startDate!);
  if (filters?.endDate) filtered = filtered.filter(r => r.dueDate <= filters.endDate!);
  return filtered;
}

export async function createAccountPayable(data: InsertAccountPayable) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(accountsPayable).values(data);
  return { id: result[0].insertId };
}

export async function updateAccountPayable(id: number, data: Partial<InsertAccountPayable>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(accountsPayable).set(data).where(eq(accountsPayable.id, id));
}

export async function markAccountPayablePaid(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(accountsPayable).set({
    status: "paid",
    paidAt: new Date(),
  }).where(eq(accountsPayable.id, id));
}
