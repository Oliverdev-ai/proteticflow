/**
 * Reports Router — ProteticFlow
 * Procedimentos tRPC para geração de relatórios agregados.
 * Produção, Financeiro, Estoque — com suporte a exportação de dados.
 * Acesso restrito a admin.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import {
  getProductionReport,
  getFinancialReport,
  getStockReport,
  getReportsSummary,
} from "../db.reports";
import { getPrediction } from "../db.predictions";

const periodSchema = z.object({
  year: z.number().int().min(2020).max(2030),
  month: z.number().int().min(1).max(12).optional(),
});

export const reportsRouter = router({
  /**
   * production — Relatório de produção por período.
   * Inclui totais, breakdown por status/serviço/cliente e lista de trabalhos.
   */
  production: protectedProcedure
    .input(periodSchema)
    .query(async ({ input }) => {
      try {
        return await getProductionReport(input.year, input.month);
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao gerar relatório de produção.",
        });
      }
    }),

  /**
   * financial — Relatório financeiro por período.
   * Inclui receita total, recebida, pendente, vencida e tendência mensal.
   */
  financial: protectedProcedure
    .input(periodSchema)
    .query(async ({ input }) => {
      try {
        return await getFinancialReport(input.year, input.month);
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao gerar relatório financeiro.",
        });
      }
    }),

  /**
   * stock — Relatório de estoque e consumo por período.
   * Inclui materiais críticos, top consumidos e movimentações.
   */
  stock: protectedProcedure
    .input(periodSchema)
    .query(async ({ input }) => {
      try {
        return await getStockReport(input.year, input.month);
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao gerar relatório de estoque.",
        });
      }
    }),

  /**
   * summary — Resumo consolidado do mês atual para Flow IA e Dashboard.
   */
  summary: protectedProcedure
    .query(async () => {
      try {
        return await getReportsSummary();
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao gerar resumo de relatórios.",
        });
      }
    }),

  /**
   * predict — Previsão de receita para o próximo mês.
   * Usa média móvel ponderada (WMA) dos últimos 6 meses,
   * ajuste de pipeline e índice sazonal.
   * Acesso restrito a admin.
   */
  predict: adminProcedure
    .query(async () => {
      try {
        const prediction = await getPrediction();
        if (!prediction) {
          throw new TRPCError({
            code: "SERVICE_UNAVAILABLE",
            message: "Banco de dados indisponível para gerar previsão.",
          });
        }
        return prediction;
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao gerar previsão de receita.",
        });
      }
    }),
});
