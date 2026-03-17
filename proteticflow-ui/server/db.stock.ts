/**
 * db.stock.ts — ProteticFlow
 * Query helpers para o módulo de Estoque:
 * materialCategories, suppliers, materials, stockMovements
 */
import { eq, desc, and, sql, count, asc, like, or } from "drizzle-orm";
import { getDb } from "./db";
import {
  materialCategories, InsertMaterialCategory,
  suppliers, InsertSupplier,
  materials, InsertMaterial,
  stockMovements, InsertStockMovement,
} from "../drizzle/schema";

// ─── Material Categories ────────────────────────────────────

export async function listMaterialCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(materialCategories).orderBy(asc(materialCategories.name));
}

export async function createMaterialCategory(data: InsertMaterialCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(materialCategories).values(data);
  return { id: result[0].insertId };
}

export async function updateMaterialCategory(id: number, data: Partial<InsertMaterialCategory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(materialCategories).set(data).where(eq(materialCategories.id, id));
}

export async function deleteMaterialCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(materialCategories).where(eq(materialCategories.id, id));
}

// ─── Suppliers ─────────────────────────────────────────────

export async function listSuppliers(activeOnly = true) {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) {
    return db.select().from(suppliers)
      .where(eq(suppliers.isActive, true))
      .orderBy(asc(suppliers.name));
  }
  return db.select().from(suppliers).orderBy(asc(suppliers.name));
}

export async function getSupplier(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  return result[0];
}

export async function createSupplier(data: InsertSupplier) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(suppliers).values(data);
  return { id: result[0].insertId };
}

export async function updateSupplier(id: number, data: Partial<InsertSupplier>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(suppliers).set(data).where(eq(suppliers.id, id));
}

export async function deactivateSupplier(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(suppliers).set({ isActive: false }).where(eq(suppliers.id, id));
}

// ─── Materials ─────────────────────────────────────────────

export async function listMaterials(filters?: {
  search?: string;
  categoryId?: number;
  supplierId?: number;
  lowStockOnly?: boolean;
  activeOnly?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      id: materials.id,
      name: materials.name,
      unit: materials.unit,
      currentStock: materials.currentStock,
      minStock: materials.minStock,
      maxStock: materials.maxStock,
      costPrice: materials.costPrice,
      notes: materials.notes,
      isActive: materials.isActive,
      createdAt: materials.createdAt,
      updatedAt: materials.updatedAt,
      categoryId: materials.categoryId,
      categoryName: materialCategories.name,
      categoryColor: materialCategories.color,
      supplierId: materials.supplierId,
      supplierName: suppliers.name,
    })
    .from(materials)
    .leftJoin(materialCategories, eq(materials.categoryId, materialCategories.id))
    .leftJoin(suppliers, eq(materials.supplierId, suppliers.id))
    .orderBy(asc(materials.name));

  let filtered = result;

  if (filters?.activeOnly !== false) {
    filtered = filtered.filter(m => m.isActive);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.categoryName?.toLowerCase().includes(q) ?? false) ||
      (m.supplierName?.toLowerCase().includes(q) ?? false)
    );
  }
  if (filters?.categoryId) {
    filtered = filtered.filter(m => m.categoryId === filters.categoryId);
  }
  if (filters?.supplierId) {
    filtered = filtered.filter(m => m.supplierId === filters.supplierId);
  }
  if (filters?.lowStockOnly) {
    filtered = filtered.filter(m =>
      parseFloat(m.currentStock) <= parseFloat(m.minStock)
    );
  }

  return filtered;
}

export async function getMaterial(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({
      id: materials.id,
      name: materials.name,
      unit: materials.unit,
      currentStock: materials.currentStock,
      minStock: materials.minStock,
      maxStock: materials.maxStock,
      costPrice: materials.costPrice,
      notes: materials.notes,
      isActive: materials.isActive,
      categoryId: materials.categoryId,
      categoryName: materialCategories.name,
      supplierId: materials.supplierId,
      supplierName: suppliers.name,
      createdAt: materials.createdAt,
      updatedAt: materials.updatedAt,
    })
    .from(materials)
    .leftJoin(materialCategories, eq(materials.categoryId, materialCategories.id))
    .leftJoin(suppliers, eq(materials.supplierId, suppliers.id))
    .where(eq(materials.id, id))
    .limit(1);
  return result[0];
}

export async function createMaterial(data: InsertMaterial) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(materials).values(data);
  return { id: result[0].insertId };
}

export async function updateMaterial(id: number, data: Partial<InsertMaterial>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(materials).set(data).where(eq(materials.id, id));
}

export async function deactivateMaterial(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(materials).set({ isActive: false }).where(eq(materials.id, id));
}

/**
 * getLowStockMaterials — Retorna materiais com estoque <= mínimo.
 * Usado para alertas automáticos e contexto da Flow IA.
 */
export async function getLowStockMaterials() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      id: materials.id,
      name: materials.name,
      unit: materials.unit,
      currentStock: materials.currentStock,
      minStock: materials.minStock,
      categoryName: materialCategories.name,
      supplierName: suppliers.name,
      supplierPhone: suppliers.phone,
    })
    .from(materials)
    .leftJoin(materialCategories, eq(materials.categoryId, materialCategories.id))
    .leftJoin(suppliers, eq(materials.supplierId, suppliers.id))
    .where(
      and(
        eq(materials.isActive, true),
        sql`${materials.currentStock} <= ${materials.minStock}`
      )
    )
    .orderBy(
      // Ordenar pelo quanto está abaixo do mínimo (mais crítico primeiro)
      sql`(${materials.minStock} - ${materials.currentStock}) DESC`
    );

  return result;
}

// ─── Stock Movements ───────────────────────────────────────

export async function listStockMovements(filters?: {
  materialId?: number;
  type?: "in" | "out" | "adjustment";
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      id: stockMovements.id,
      materialId: stockMovements.materialId,
      materialName: materials.name,
      materialUnit: materials.unit,
      type: stockMovements.type,
      quantity: stockMovements.quantity,
      stockAfter: stockMovements.stockAfter,
      reason: stockMovements.reason,
      jobId: stockMovements.jobId,
      invoiceNumber: stockMovements.invoiceNumber,
      unitCost: stockMovements.unitCost,
      notes: stockMovements.notes,
      createdBy: stockMovements.createdBy,
      createdAt: stockMovements.createdAt,
    })
    .from(stockMovements)
    .leftJoin(materials, eq(stockMovements.materialId, materials.id))
    .orderBy(desc(stockMovements.createdAt))
    .limit(filters?.limit ?? 200);

  let filtered = result;
  if (filters?.materialId) filtered = filtered.filter(m => m.materialId === filters.materialId);
  if (filters?.type) filtered = filtered.filter(m => m.type === filters.type);
  if (filters?.startDate) filtered = filtered.filter(m => m.createdAt >= filters.startDate!);
  if (filters?.endDate) filtered = filtered.filter(m => m.createdAt <= filters.endDate!);

  return filtered;
}

/**
 * registerMovement — Registra entrada/saída/ajuste e atualiza currentStock.
 * Retorna o estoque resultante e flag de alerta de reposição.
 */
export async function registerMovement(data: InsertStockMovement & { materialId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar estoque atual
  const [mat] = await db.select({
    currentStock: materials.currentStock,
    minStock: materials.minStock,
    name: materials.name,
    unit: materials.unit,
  }).from(materials).where(eq(materials.id, data.materialId)).limit(1);

  if (!mat) throw new Error("Material não encontrado.");

  const current = parseFloat(mat.currentStock);
  const qty = parseFloat(String(data.quantity));
  const minStock = parseFloat(mat.minStock);

  let newStock: number;
  if (data.type === "in") {
    newStock = current + qty;
  } else if (data.type === "out") {
    if (qty > current) {
      throw new Error(
        `Estoque insuficiente. Atual: ${current} ${mat.unit}. Solicitado: ${qty} ${mat.unit}.`
      );
    }
    newStock = current - qty;
  } else {
    // adjustment: quantity é o novo valor absoluto
    newStock = qty;
  }

  const stockAfter = newStock.toFixed(3);

  // Registrar movimentação
  const result = await db.insert(stockMovements).values({
    ...data,
    stockAfter,
  });

  // Atualizar estoque atual do material
  await db.update(materials)
    .set({ currentStock: stockAfter })
    .where(eq(materials.id, data.materialId));

  const isLow = newStock <= minStock;

  return {
    id: result[0].insertId,
    stockAfter: newStock,
    isLow,
    materialName: mat.name,
    minStock,
  };
}

/**
 * getStockConsumptionReport — Relatório de consumo mensal por material.
 * Soma todas as saídas do período.
 */
export async function getStockConsumptionReport(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      materialId: stockMovements.materialId,
      materialName: materials.name,
      unit: materials.unit,
      categoryName: materialCategories.name,
      totalOut: sql<string>`SUM(CASE WHEN ${stockMovements.type} = 'out' THEN ${stockMovements.quantity} ELSE 0 END)`,
      totalIn: sql<string>`SUM(CASE WHEN ${stockMovements.type} = 'in' THEN ${stockMovements.quantity} ELSE 0 END)`,
      movementCount: count(stockMovements.id),
    })
    .from(stockMovements)
    .leftJoin(materials, eq(stockMovements.materialId, materials.id))
    .leftJoin(materialCategories, eq(materials.categoryId, materialCategories.id))
    .where(
      and(
        sql`${stockMovements.createdAt} >= ${startDate}`,
        sql`${stockMovements.createdAt} <= ${endDate}`
      )
    )
    .groupBy(stockMovements.materialId, materials.name, materials.unit, materialCategories.name)
    .orderBy(sql`totalOut DESC`);

  return result;
}

/**
 * getStockSummary — Resumo geral do estoque para dashboard e Flow IA.
 */
export async function getStockSummary() {
  const db = await getDb();
  if (!db) return { totalMaterials: 0, lowStockCount: 0, totalValue: 0, categories: 0 };

  const [totals] = await db
    .select({
      totalMaterials: count(materials.id),
      totalValue: sql<string>`SUM(${materials.currentStock} * ${materials.costPrice})`,
    })
    .from(materials)
    .where(eq(materials.isActive, true));

  const [lowCount] = await db
    .select({ cnt: count(materials.id) })
    .from(materials)
    .where(
      and(
        eq(materials.isActive, true),
        sql`${materials.currentStock} <= ${materials.minStock}`
      )
    );

  const [catCount] = await db
    .select({ cnt: count(materialCategories.id) })
    .from(materialCategories);

  return {
    totalMaterials: totals?.totalMaterials ?? 0,
    lowStockCount: lowCount?.cnt ?? 0,
    totalValue: parseFloat(totals?.totalValue ?? "0"),
    categories: catCount?.cnt ?? 0,
  };
}
