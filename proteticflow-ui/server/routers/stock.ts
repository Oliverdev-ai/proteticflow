/**
 * Stock Router — ProteticFlow
 * Procedimentos tRPC para o Módulo de Estoque:
 * categorias, fornecedores, materiais, movimentações e alertas.
 */
import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import * as stock from "../db.stock";
import { createNotification, getAllActiveUserIds } from "../db";
import { getUserPushSubscriptions } from "../db.push";
import { sendPushToSubscription } from "../push";

export const stockRouter = router({
  // ─── Categories ──────────────────────────────────────────

  categories: router({
    list: protectedProcedure.query(async () => {
      return stock.listMaterialCategories();
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(128),
        description: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return stock.createMaterialCategory(input);
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(128).optional(),
        description: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await stock.updateMaterialCategory(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await stock.deleteMaterialCategory(input.id);
        return { success: true };
      }),
  }),

  // ─── Suppliers ───────────────────────────────────────────

  suppliers: router({
    list: protectedProcedure
      .input(z.object({ activeOnly: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
        return stock.listSuppliers(input?.activeOnly !== false);
      }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        contact: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return stock.createSupplier(input);
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        contact: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await stock.updateSupplier(id, data);
        return { success: true };
      }),

    deactivate: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await stock.deactivateSupplier(input.id);
        return { success: true };
      }),
  }),

  // ─── Materials ───────────────────────────────────────────

  materials: router({
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        categoryId: z.number().optional(),
        supplierId: z.number().optional(),
        lowStockOnly: z.boolean().optional(),
      }).optional())
      .query(async ({ input }) => {
        return stock.listMaterials(input);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const mat = await stock.getMaterial(input.id);
        if (!mat) throw new Error("Material não encontrado.");
        return mat;
      }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        unit: z.string().min(1).max(32),
        categoryId: z.number().optional(),
        supplierId: z.number().optional(),
        currentStock: z.string().optional(),
        minStock: z.string().optional(),
        maxStock: z.string().optional(),
        costPrice: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await stock.createMaterial({
          ...input,
          createdBy: ctx.user.id,
        });
        return result;
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        unit: z.string().min(1).max(32).optional(),
        categoryId: z.number().optional(),
        supplierId: z.number().optional(),
        minStock: z.string().optional(),
        maxStock: z.string().optional(),
        costPrice: z.string().optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await stock.updateMaterial(id, data);
        return { success: true };
      }),

    deactivate: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await stock.deactivateMaterial(input.id);
        return { success: true };
      }),

    lowStock: protectedProcedure.query(async () => {
      return stock.getLowStockMaterials();
    }),

    summary: protectedProcedure.query(async () => {
      return stock.getStockSummary();
    }),
  }),

  // ─── Movements ───────────────────────────────────────────

  movements: router({
    list: protectedProcedure
      .input(z.object({
        materialId: z.number().optional(),
        type: z.enum(["in", "out", "adjustment"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return stock.listStockMovements(input);
      }),

    /**
     * register — Registra entrada, saída ou ajuste de estoque.
     * Dispara alerta automático se estoque cair abaixo do mínimo.
     */
    register: protectedProcedure
      .input(z.object({
        materialId: z.number(),
        type: z.enum(["in", "out", "adjustment"]),
        quantity: z.string().refine(v => parseFloat(v) > 0, "Quantidade deve ser maior que zero"),
        reason: z.string().optional(),
        jobId: z.number().optional(),
        invoiceNumber: z.string().optional(),
        unitCost: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await stock.registerMovement({
          ...input,
          createdBy: ctx.user.id,
          stockAfter: "0", // será calculado no helper
        });

        // Alerta automático se estoque ficou abaixo do mínimo
        if (result.isLow) {
          const userIds = await getAllActiveUserIds();
          const alertMsg = `${result.materialName}: estoque atual ${result.stockAfter.toFixed(3)} ≤ mínimo ${result.minStock.toFixed(3)}. Solicite reposição.`;

          await Promise.all(
            userIds.map(async (userId) => {
              // Notificação in-app
              await createNotification({
                userId,
                title: `⚠️ Estoque baixo: ${result.materialName}`,
                message: alertMsg,
                type: "warning",
              });
              // Push notification
              const subs = await getUserPushSubscriptions(userId);
              await Promise.all(
                subs.map(sub =>
                  sendPushToSubscription(sub, {
                    title: `⚠️ Estoque baixo: ${result.materialName}`,
                    body: alertMsg,
                    url: "/estoque",
                    tag: `stock-low-${result.materialName}`,
                  })
                )
              );
            })
          );
        }

        return {
          success: true,
          movementId: result.id,
          stockAfter: result.stockAfter,
          isLow: result.isLow,
          materialName: result.materialName,
        };
      }),

    consumptionReport: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        return stock.getStockConsumptionReport(input.startDate, input.endDate);
      }),
  }),
});
