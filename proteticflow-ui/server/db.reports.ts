/**
 * db.reports.ts — ProteticFlow
 * Helpers de dados agregados para o módulo de Relatórios.
 * Produção, Financeiro, Estoque, Desempenho por cliente.
 */
import { getDb } from "./db";
import {
  jobs, clients, priceItems, accountsReceivable,
  financialClosings, stockMovements, materials, materialCategories,
  jobLogs, users,
} from "../drizzle/schema";
import { eq, and, gte, lte, sql, count, sum, desc, asc, ne } from "drizzle-orm";

// ─── Date Helpers ──────────────────────────────────────────

function periodBounds(year: number, month?: number): { start: Date; end: Date } {
  if (month !== undefined) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    return { start, end };
  }
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59);
  return { start, end };
}

// ─── Production Report ─────────────────────────────────────

export interface ProductionReportData {
  period: string;
  totalJobs: number;
  deliveredJobs: number;
  pendingJobs: number;
  overdueJobs: number;
  avgDeliveryDays: number;
  byStatus: Array<{ status: string; label: string; count: number }>;
  byService: Array<{ serviceName: string; count: number; totalValue: number }>;
  byClient: Array<{ clientName: string; count: number; totalValue: number }>;
  topServices: Array<{ serviceName: string; count: number }>;
  jobsList: Array<{
    id: number;
    code: string;
    orderNumber: number | null;
    serviceName: string;
    clientName: string;
    patientName: string | null;
    status: string;
    deadline: Date;
    deliveredAt: Date | null;
    price: string;
    assignedToName: string | null;
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  waiting: "Aguardando",
  in_production: "Em Produção",
  review: "Revisão",
  ready: "Pronto",
  delivered: "Entregue",
  overdue: "Atrasado",
};

export async function getProductionReport(
  year: number,
  month?: number
): Promise<ProductionReportData> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { start, end } = periodBounds(year, month);
  const period = month
    ? `${String(month).padStart(2, "0")}/${year}`
    : String(year);

  // All jobs in period (by creation date)
  const allJobs = await db
    .select({
      id: jobs.id,
      code: jobs.code,
      orderNumber: jobs.orderNumber,
      serviceName: jobs.serviceName,
      clientId: jobs.clientId,
      clientName: clients.name,
      patientName: jobs.patientName,
      status: jobs.status,
      deadline: jobs.deadline,
      deliveredAt: jobs.deliveredAt,
      price: jobs.price,
      assignedTo: jobs.assignedTo,
      createdAt: jobs.createdAt,
    })
    .from(jobs)
    .leftJoin(clients, eq(jobs.clientId, clients.id))
    .where(and(gte(jobs.createdAt, start), lte(jobs.createdAt, end)))
    .orderBy(desc(jobs.createdAt));

  // Assigned user names
  const userRows = await db.select({ id: users.id, name: users.name }).from(users);
  const userMap = new Map(userRows.map(u => [u.id, u.name]));

  const totalJobs = allJobs.length;
  const deliveredJobs = allJobs.filter(j => j.status === "delivered").length;
  const pendingJobs = allJobs.filter(j => !["delivered"].includes(j.status)).length;
  const overdueJobs = allJobs.filter(j => {
    if (j.status === "delivered") return false;
    return new Date(j.deadline) < new Date();
  }).length;

  // Avg delivery days (from createdAt to deliveredAt)
  const deliveredWithDates = allJobs.filter(j => j.status === "delivered" && j.deliveredAt);
  const avgDeliveryDays = deliveredWithDates.length > 0
    ? Math.round(
        deliveredWithDates.reduce((acc, j) => {
          const days = (new Date(j.deliveredAt!).getTime() - new Date(j.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          return acc + days;
        }, 0) / deliveredWithDates.length
      )
    : 0;

  // By status
  const statusCounts: Record<string, number> = {};
  for (const j of allJobs) {
    statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
  }
  const byStatus = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    label: STATUS_LABELS[status] ?? status,
    count,
  }));

  // By service
  const serviceMap: Record<string, { count: number; totalValue: number }> = {};
  for (const j of allJobs) {
    if (!serviceMap[j.serviceName]) serviceMap[j.serviceName] = { count: 0, totalValue: 0 };
    serviceMap[j.serviceName].count++;
    serviceMap[j.serviceName].totalValue += parseFloat(j.price ?? "0");
  }
  const byService = Object.entries(serviceMap)
    .map(([serviceName, data]) => ({ serviceName, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // By client
  const clientMap: Record<string, { count: number; totalValue: number }> = {};
  for (const j of allJobs) {
    const name = j.clientName ?? "Sem cliente";
    if (!clientMap[name]) clientMap[name] = { count: 0, totalValue: 0 };
    clientMap[name].count++;
    clientMap[name].totalValue += parseFloat(j.price ?? "0");
  }
  const byClient = Object.entries(clientMap)
    .map(([clientName, data]) => ({ clientName, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topServices = byService.slice(0, 5).map(s => ({
    serviceName: s.serviceName,
    count: s.count,
  }));

  const jobsList = allJobs.map(j => ({
    id: j.id,
    code: j.code,
    orderNumber: j.orderNumber,
    serviceName: j.serviceName,
    clientName: j.clientName ?? "—",
    patientName: j.patientName,
    status: j.status,
    deadline: j.deadline,
    deliveredAt: j.deliveredAt,
    price: j.price,
    assignedToName: j.assignedTo ? (userMap.get(j.assignedTo) ?? null) : null,
  }));

  return {
    period,
    totalJobs,
    deliveredJobs,
    pendingJobs,
    overdueJobs,
    avgDeliveryDays,
    byStatus,
    byService,
    byClient,
    topServices,
    jobsList,
  };
}

// ─── Financial Report ──────────────────────────────────────

export interface FinancialReportData {
  period: string;
  totalRevenue: number;
  receivedRevenue: number;
  pendingRevenue: number;
  overdueRevenue: number;
  totalExpenses: number;
  netResult: number;
  byClient: Array<{ clientName: string; total: number; received: number; pending: number }>;
  monthlyTrend: Array<{ month: string; revenue: number; received: number }>;
  receivablesList: Array<{
    id: number;
    jobCode: string;
    clientName: string;
    amount: string;
    dueDate: Date;
    paidAt: Date | null;
    status: string;
    description: string | null;
  }>;
}

export async function getFinancialReport(
  year: number,
  month?: number
): Promise<FinancialReportData> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { start, end } = periodBounds(year, month);
  const period = month
    ? `${String(month).padStart(2, "0")}/${year}`
    : String(year);

  // Accounts receivable in period
  const arRows = await db
    .select({
      id: accountsReceivable.id,
      jobId: accountsReceivable.jobId,
      jobCode: jobs.code,
      clientId: accountsReceivable.clientId,
      clientName: clients.name,
      amount: accountsReceivable.amount,
      dueDate: accountsReceivable.dueDate,
      paidAt: accountsReceivable.paidAt,
      status: accountsReceivable.status,
      description: accountsReceivable.description,
    })
    .from(accountsReceivable)
    .leftJoin(jobs, eq(accountsReceivable.jobId, jobs.id))
    .leftJoin(clients, eq(accountsReceivable.clientId, clients.id))
    .where(and(gte(accountsReceivable.dueDate, start), lte(accountsReceivable.dueDate, end)))
    .orderBy(desc(accountsReceivable.dueDate));

  const totalRevenue = arRows.reduce((s, r) => s + parseFloat(r.amount ?? "0"), 0);
  const receivedRevenue = arRows
    .filter(r => r.status === "paid")
    .reduce((s, r) => s + parseFloat(r.amount ?? "0"), 0);
  const pendingRevenue = arRows
    .filter(r => r.status === "pending")
    .reduce((s, r) => s + parseFloat(r.amount ?? "0"), 0);
  const overdueRevenue = arRows
    .filter(r => r.status === "overdue")
    .reduce((s, r) => s + parseFloat(r.amount ?? "0"), 0);

  // Financial closings (expenses)
  // financialClosings não tem campo de despesas direto; usamos pendingAmount como proxy
  const closingRows = await db
    .select({ totalPending: sql<number>`COALESCE(SUM(${financialClosings.pendingAmount}), 0)` })
    .from(financialClosings)
    .where(and(
      gte(financialClosings.createdAt, start),
      lte(financialClosings.createdAt, end)
    ));
  const totalExpenses = Number(closingRows[0]?.totalPending ?? 0);

  const netResult = receivedRevenue - totalExpenses;

  // By client
  const clientMap: Record<string, { total: number; received: number; pending: number }> = {};
  for (const r of arRows) {
    const name = r.clientName ?? "Sem cliente";
    if (!clientMap[name]) clientMap[name] = { total: 0, received: 0, pending: 0 };
    const amt = parseFloat(r.amount ?? "0");
    clientMap[name].total += amt;
    if (r.status === "paid") clientMap[name].received += amt;
    else clientMap[name].pending += amt;
  }
  const byClient = Object.entries(clientMap)
    .map(([clientName, data]) => ({ clientName, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Monthly trend (last 6 months)
  const monthlyTrend: Array<{ month: string; revenue: number; received: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, (month ?? new Date().getMonth() + 1) - 1 - i, 1);
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const mRows = await db
      .select({ amount: accountsReceivable.amount, status: accountsReceivable.status })
      .from(accountsReceivable)
      .where(and(gte(accountsReceivable.dueDate, mStart), lte(accountsReceivable.dueDate, mEnd)));
    const revenue = mRows.reduce((s, r) => s + parseFloat(r.amount ?? "0"), 0);
    const received = mRows.filter(r => r.status === "paid").reduce((s, r) => s + parseFloat(r.amount ?? "0"), 0);
    monthlyTrend.push({
      month: `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`,
      revenue,
      received,
    });
  }

  const receivablesList = arRows.map(r => ({
    id: r.id,
    jobCode: r.jobCode ?? "—",
    clientName: r.clientName ?? "—",
    amount: r.amount,
    dueDate: r.dueDate,
    paidAt: r.paidAt,
    status: r.status,
    description: r.description,
  }));

  return {
    period,
    totalRevenue,
    receivedRevenue,
    pendingRevenue,
    overdueRevenue,
    totalExpenses,
    netResult,
    byClient,
    monthlyTrend,
    receivablesList,
  };
}

// ─── Stock Report ──────────────────────────────────────────

export interface StockReportData {
  period: string;
  totalMaterials: number;
  lowStockCount: number;
  totalStockValue: number;
  totalConsumed: number;
  totalReceived: number;
  topConsumed: Array<{ materialName: string; unit: string; quantity: number; totalCost: number }>;
  byCategory: Array<{ categoryName: string; materialCount: number; totalValue: number }>;
  movementsList: Array<{
    id: number;
    materialName: string;
    categoryName: string;
    type: string;
    quantity: number;
    unitCost: string | null;
    reason: string | null;
    createdAt: Date;
  }>;
}

export async function getStockReport(
  year: number,
  month?: number
): Promise<StockReportData> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { start, end } = periodBounds(year, month);
  const period = month
    ? `${String(month).padStart(2, "0")}/${year}`
    : String(year);

  // All materials
  const allMaterials = await db
    .select({
      id: materials.id,
      name: materials.name,
      unit: materials.unit,
      currentStock: materials.currentStock,
      minStock: materials.minStock,
      costPrice: materials.costPrice,
      categoryId: materials.categoryId,
      categoryName: materialCategories.name,
    })
    .from(materials)
    .leftJoin(materialCategories, eq(materials.categoryId, materialCategories.id))
    .where(eq(materials.isActive, true));

  const totalMaterials = allMaterials.length;
  const lowStockCount = allMaterials.filter(m => {
    const curr = parseFloat(String(m.currentStock ?? "0"));
    const min = parseFloat(String(m.minStock ?? "0"));
    return curr <= min;
  }).length;
  const totalStockValue = allMaterials.reduce((s, m) => {
    const curr = parseFloat(String(m.currentStock ?? "0"));
    const cost = parseFloat(String(m.costPrice ?? "0"));
    return s + curr * cost;
  }, 0);

  // Movements in period
  const movRows = await db
    .select({
      id: stockMovements.id,
      materialId: stockMovements.materialId,
      materialName: materials.name,
      unit: materials.unit,
      categoryName: materialCategories.name,
      type: stockMovements.type,
      quantity: stockMovements.quantity,
      unitCost: stockMovements.unitCost,
      reason: stockMovements.reason,
      createdAt: stockMovements.createdAt,
    })
    .from(stockMovements)
    .leftJoin(materials, eq(stockMovements.materialId, materials.id))
    .leftJoin(materialCategories, eq(materials.categoryId, materialCategories.id))
    .where(and(gte(stockMovements.createdAt, start), lte(stockMovements.createdAt, end)))
    .orderBy(desc(stockMovements.createdAt));

  const totalConsumed = movRows
    .filter(m => m.type === "out")
    .reduce((s, m) => s + parseFloat(String(m.quantity ?? "0")), 0);
  const totalReceived = movRows
    .filter(m => m.type === "in")
    .reduce((s, m) => s + parseFloat(String(m.quantity ?? "0")), 0);

  // Top consumed materials
  const consumedMap: Record<number, { materialName: string; unit: string; quantity: number; totalCost: number }> = {};
  for (const m of movRows.filter(m => m.type === "out")) {
    const id = m.materialId ?? 0;
    if (!consumedMap[id]) consumedMap[id] = { materialName: m.materialName ?? "—", unit: m.unit ?? "", quantity: 0, totalCost: 0 };
    const qty = parseFloat(String(m.quantity ?? "0"));
    const cost = parseFloat(String(m.unitCost ?? "0"));
    consumedMap[id].quantity += qty;
    consumedMap[id].totalCost += qty * cost;
  }
  const topConsumed = Object.values(consumedMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // By category
  const catMap: Record<string, { materialCount: number; totalValue: number }> = {};
  for (const m of allMaterials) {
    const cat = m.categoryName ?? "Sem categoria";
    if (!catMap[cat]) catMap[cat] = { materialCount: 0, totalValue: 0 };
    catMap[cat].materialCount++;
    const curr = parseFloat(String(m.currentStock ?? "0"));
    const cost = parseFloat(String(m.costPrice ?? "0"));
    catMap[cat].totalValue += curr * cost;
  }
  const byCategory = Object.entries(catMap)
    .map(([categoryName, data]) => ({ categoryName, ...data }))
    .sort((a, b) => b.totalValue - a.totalValue);

  const movementsList = movRows.map(m => ({
    id: m.id,
    materialName: m.materialName ?? "—",
    categoryName: m.categoryName ?? "—",
    type: m.type,
    quantity: parseFloat(String(m.quantity ?? "0")),
    unitCost: m.unitCost,
    reason: m.reason,
    createdAt: m.createdAt,
  }));

  return {
    period,
    totalMaterials,
    lowStockCount,
    totalStockValue,
    totalConsumed,
    totalReceived,
    topConsumed,
    byCategory,
    movementsList,
  };
}

// ─── Summary (for Flow IA) ─────────────────────────────────

export async function getReportsSummary() {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [prod, fin, stock] = await Promise.all([
    getProductionReport(year, month),
    getFinancialReport(year, month),
    getStockReport(year, month),
  ]);

  return {
    production: {
      totalJobs: prod.totalJobs,
      delivered: prod.deliveredJobs,
      overdue: prod.overdueJobs,
      topService: prod.topServices[0]?.serviceName ?? "—",
    },
    financial: {
      totalRevenue: fin.totalRevenue,
      received: fin.receivedRevenue,
      pending: fin.pendingRevenue,
      netResult: fin.netResult,
    },
    stock: {
      totalMaterials: stock.totalMaterials,
      lowStock: stock.lowStockCount,
      totalValue: stock.totalStockValue,
      topConsumed: stock.topConsumed[0]?.materialName ?? "—",
    },
  };
}
