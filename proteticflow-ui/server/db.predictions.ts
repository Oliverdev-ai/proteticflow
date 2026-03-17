/**
 * db.predictions.ts — ProteticFlow
 * Motor preditivo de receita para a Flow IA.
 *
 * Algoritmo:
 * 1. Média Móvel Ponderada (WMA) dos últimos 6 meses — meses mais recentes têm peso maior.
 * 2. Ajuste de Pipeline — trabalhos ativos (não entregues) com prazo no próximo mês.
 * 3. Ajuste de Sazonalidade — índice sazonal calculado com base nos últimos 2 anos.
 * 4. Intervalo de Confiança — baseado no desvio padrão histórico.
 * 5. Fatores de risco e oportunidade identificados automaticamente.
 */
import { getDb } from "./db";
import {
  accountsReceivable, jobs, clients,
} from "../drizzle/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

// ─── Types ─────────────────────────────────────────────────

export interface MonthlyRevenue {
  year: number;
  month: number;
  label: string;
  totalRevenue: number;
  receivedRevenue: number;
  jobCount: number;
}

export interface PipelineJob {
  id: number;
  code: string;
  clientName: string | null;
  serviceName: string;
  price: number;
  deadline: Date;
  status: string;
}

export interface PredictionFactor {
  type: "positive" | "negative" | "neutral";
  label: string;
  description: string;
  impact: number; // percentage impact on prediction
}

export interface RevenuePrediction {
  targetMonth: string;       // "04/2026"
  targetYear: number;
  targetMonthNum: number;

  // Core prediction
  baseEstimate: number;      // WMA result
  pipelineValue: number;     // value from active jobs with deadline in target month
  seasonalIndex: number;     // 1.0 = neutral, >1 = high season, <1 = low season
  finalEstimate: number;     // baseEstimate * seasonalIndex + pipelineAdjustment

  // Confidence
  confidenceLevel: number;   // 0-100
  confidenceLabel: "Alta" | "Média" | "Baixa";
  lowerBound: number;
  upperBound: number;

  // Context
  historicalMonths: MonthlyRevenue[];  // last 6 months used for WMA
  pipelineJobs: PipelineJob[];         // jobs contributing to pipeline
  factors: PredictionFactor[];         // positive/negative factors

  // Trend
  trendDirection: "crescente" | "estável" | "decrescente";
  trendPercent: number;      // % change vs same month last year (or avg)

  // Recommendations
  recommendations: string[];
}

// ─── Helpers ───────────────────────────────────────────────

function monthLabel(year: number, month: number): string {
  return `${String(month).padStart(2, "0")}/${year}`;
}

function monthBounds(year: number, month: number): { start: Date; end: Date } {
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0, 23, 59, 59),
  };
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

// Weighted Moving Average — weights: [1, 2, 3, 4, 5, 6] for oldest to newest
function weightedMovingAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const n = values.length;
  const totalWeight = (n * (n + 1)) / 2;
  const weighted = values.reduce((sum, val, i) => sum + val * (i + 1), 0);
  return weighted / totalWeight;
}

// ─── Core: fetch historical monthly revenue ────────────────

async function getHistoricalRevenue(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  monthsBack: number
): Promise<MonthlyRevenue[]> {
  const now = new Date();
  const result: MonthlyRevenue[] = [];

  for (let i = monthsBack; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const { start, end } = monthBounds(year, month);

    const rows = await db
      .select({
        amount: accountsReceivable.amount,
        status: accountsReceivable.status,
      })
      .from(accountsReceivable)
      .where(and(
        gte(accountsReceivable.dueDate, start),
        lte(accountsReceivable.dueDate, end)
      ));

    // Count jobs created in this month
    const jobRows = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(gte(jobs.createdAt, start), lte(jobs.createdAt, end)));

    const totalRevenue = rows.reduce((s, r) => s + parseFloat(r.amount ?? "0"), 0);
    const receivedRevenue = rows
      .filter(r => r.status === "paid")
      .reduce((s, r) => s + parseFloat(r.amount ?? "0"), 0);

    result.push({
      year,
      month,
      label: monthLabel(year, month),
      totalRevenue,
      receivedRevenue,
      jobCount: jobRows.length,
    });
  }

  return result;
}

// ─── Core: fetch pipeline jobs ─────────────────────────────

async function getPipelineJobs(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  targetYear: number,
  targetMonth: number
): Promise<PipelineJob[]> {
  const { start, end } = monthBounds(targetYear, targetMonth);

  const rows = await db
    .select({
      id: jobs.id,
      code: jobs.code,
      clientName: clients.name,
      serviceName: jobs.serviceName,
      price: jobs.price,
      deadline: jobs.deadline,
      status: jobs.status,
    })
    .from(jobs)
    .leftJoin(clients, eq(jobs.clientId, clients.id))
    .where(and(
      gte(jobs.deadline, start),
      lte(jobs.deadline, end),
      // Active jobs (not yet delivered)
      sql`${jobs.status} NOT IN ('delivered')`
    ));

  return rows.map(r => ({
    id: r.id,
    code: r.code,
    clientName: r.clientName,
    serviceName: r.serviceName,
    price: parseFloat(r.price ?? "0"),
    deadline: r.deadline,
    status: r.status,
  }));
}

// ─── Core: seasonal index ──────────────────────────────────

async function getSeasonalIndex(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  targetMonth: number
): Promise<number> {
  // Get the same month for the last 2 years
  const now = new Date();
  const currentYear = now.getFullYear();
  const sameMonthRevenues: number[] = [];

  for (let y = currentYear - 2; y < currentYear; y++) {
    const { start, end } = monthBounds(y, targetMonth);
    const rows = await db
      .select({ amount: accountsReceivable.amount })
      .from(accountsReceivable)
      .where(and(gte(accountsReceivable.dueDate, start), lte(accountsReceivable.dueDate, end)));
    const total = rows.reduce((s, r) => s + parseFloat(r.amount ?? "0"), 0);
    if (total > 0) sameMonthRevenues.push(total);
  }

  if (sameMonthRevenues.length === 0) return 1.0;

  // Get average monthly revenue over the same period
  const allMonthRevenues: number[] = [];
  for (let y = currentYear - 2; y < currentYear; y++) {
    for (let m = 1; m <= 12; m++) {
      const { start, end } = monthBounds(y, m);
      const rows = await db
        .select({ amount: accountsReceivable.amount })
        .from(accountsReceivable)
        .where(and(gte(accountsReceivable.dueDate, start), lte(accountsReceivable.dueDate, end)));
      const total = rows.reduce((s, r) => s + parseFloat(r.amount ?? "0"), 0);
      if (total > 0) allMonthRevenues.push(total);
    }
  }

  if (allMonthRevenues.length === 0) return 1.0;

  const avgAll = allMonthRevenues.reduce((a, b) => a + b, 0) / allMonthRevenues.length;
  const avgSameMonth = sameMonthRevenues.reduce((a, b) => a + b, 0) / sameMonthRevenues.length;

  // Clamp between 0.6 and 1.5 to avoid extreme outliers
  const index = avgAll > 0 ? avgSameMonth / avgAll : 1.0;
  return Math.max(0.6, Math.min(1.5, index));
}

// ─── Main: getPrediction ───────────────────────────────────

export async function getPrediction(): Promise<RevenuePrediction | null> {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const targetMonth = now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2;
  const targetYear = now.getMonth() + 2 > 12 ? now.getFullYear() + 1 : now.getFullYear();

  // 1. Historical revenue (last 6 months)
  const historicalMonths = await getHistoricalRevenue(db, 6);
  const historicalValues = historicalMonths.map(m => m.totalRevenue);

  // 2. Weighted Moving Average
  const baseEstimate = weightedMovingAverage(historicalValues);

  // 3. Pipeline jobs
  const pipelineJobs = await getPipelineJobs(db, targetYear, targetMonth);
  const pipelineValue = pipelineJobs.reduce((s, j) => s + j.price, 0);

  // 4. Seasonal index
  const seasonalIndex = await getSeasonalIndex(db, targetMonth);

  // 5. Final estimate
  // Formula: (WMA * seasonalIndex) + (pipeline * 0.7)
  // Pipeline discount of 30% accounts for potential cancellations/delays
  const finalEstimate = (baseEstimate * seasonalIndex) + (pipelineValue * 0.7);

  // 6. Confidence interval (based on std dev of historical)
  const sd = stdDev(historicalValues);
  const confidenceLevel = Math.max(20, Math.min(95,
    historicalValues.filter(v => v > 0).length >= 4
      ? sd > 0 && baseEstimate > 0
        ? Math.round(100 - (sd / baseEstimate) * 100)
        : 70
      : 40
  ));
  const confidenceLabel: "Alta" | "Média" | "Baixa" =
    confidenceLevel >= 70 ? "Alta" : confidenceLevel >= 45 ? "Média" : "Baixa";

  const margin = sd * 1.5;
  const lowerBound = Math.max(0, finalEstimate - margin);
  const upperBound = finalEstimate + margin;

  // 7. Trend direction
  const recentValues = historicalValues.slice(-3);
  const olderValues = historicalValues.slice(0, 3);
  const recentAvg = recentValues.length > 0 ? recentValues.reduce((a, b) => a + b, 0) / recentValues.length : 0;
  const olderAvg = olderValues.length > 0 ? olderValues.reduce((a, b) => a + b, 0) / olderValues.length : 0;
  const trendPercent = olderAvg > 0 ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0;
  const trendDirection: "crescente" | "estável" | "decrescente" =
    trendPercent > 5 ? "crescente" : trendPercent < -5 ? "decrescente" : "estável";

  // 8. Factors
  const factors: PredictionFactor[] = [];

  // Pipeline factor
  if (pipelineJobs.length > 0) {
    factors.push({
      type: "positive",
      label: "Pipeline ativo",
      description: `${pipelineJobs.length} trabalho(s) com prazo em ${monthLabel(targetYear, targetMonth)} somando R$ ${pipelineValue.toFixed(2)}`,
      impact: Math.round((pipelineValue * 0.7 / (finalEstimate || 1)) * 100),
    });
  }

  // Trend factor
  if (trendDirection === "crescente") {
    factors.push({
      type: "positive",
      label: "Tendência de crescimento",
      description: `Receita cresceu ${trendPercent}% nos últimos 3 meses vs. trimestre anterior`,
      impact: Math.min(20, Math.abs(trendPercent)),
    });
  } else if (trendDirection === "decrescente") {
    factors.push({
      type: "negative",
      label: "Tendência de queda",
      description: `Receita caiu ${Math.abs(trendPercent)}% nos últimos 3 meses vs. trimestre anterior`,
      impact: -Math.min(20, Math.abs(trendPercent)),
    });
  }

  // Seasonal factor
  if (seasonalIndex > 1.1) {
    factors.push({
      type: "positive",
      label: "Alta temporada",
      description: `Historicamente, ${monthLabel(targetYear, targetMonth).substring(0, 2)}/${targetYear} tem receita ${Math.round((seasonalIndex - 1) * 100)}% acima da média`,
      impact: Math.round((seasonalIndex - 1) * 100),
    });
  } else if (seasonalIndex < 0.9) {
    factors.push({
      type: "negative",
      label: "Baixa temporada",
      description: `Historicamente, ${monthLabel(targetYear, targetMonth).substring(0, 2)}/${targetYear} tem receita ${Math.round((1 - seasonalIndex) * 100)}% abaixo da média`,
      impact: -Math.round((1 - seasonalIndex) * 100),
    });
  }

  // Overdue jobs factor
  const overdueCount = pipelineJobs.filter(j => j.status === "overdue").length;
  if (overdueCount > 0) {
    factors.push({
      type: "negative",
      label: "Trabalhos atrasados no pipeline",
      description: `${overdueCount} trabalho(s) do pipeline já estão atrasados, reduzindo probabilidade de entrega no mês`,
      impact: -Math.min(15, overdueCount * 3),
    });
  }

  // Low historical data factor
  const nonZeroMonths = historicalValues.filter(v => v > 0).length;
  if (nonZeroMonths < 3) {
    factors.push({
      type: "neutral",
      label: "Dados históricos limitados",
      description: `Apenas ${nonZeroMonths} mês(es) com dados de receita. A previsão ficará mais precisa com o tempo.`,
      impact: 0,
    });
  }

  // High variance factor
  if (sd > baseEstimate * 0.3 && baseEstimate > 0) {
    factors.push({
      type: "negative",
      label: "Alta variabilidade histórica",
      description: `Desvio padrão de R$ ${sd.toFixed(2)} indica receita irregular — amplia o intervalo de confiança`,
      impact: -10,
    });
  }

  // 9. Recommendations
  const recommendations: string[] = [];

  if (pipelineJobs.length === 0) {
    recommendations.push("Nenhum trabalho com prazo no próximo mês. Considere adiantar negociações com clientes para garantir volume.");
  }
  if (trendDirection === "decrescente") {
    recommendations.push("Tendência de queda nos últimos meses. Avalie campanhas de retenção ou promoções para clientes inativos.");
  }
  if (overdueCount > 0) {
    recommendations.push(`${overdueCount} trabalho(s) atrasados no pipeline. Priorize a entrega para garantir o faturamento previsto.`);
  }
  if (confidenceLevel < 50) {
    recommendations.push("Confiança baixa na previsão. Mantenha os dados de receita atualizados para melhorar a precisão do modelo.");
  }
  if (seasonalIndex > 1.1) {
    recommendations.push("Mês historicamente forte. Garanta capacidade de produção suficiente para atender o aumento de demanda.");
  }
  if (recommendations.length === 0) {
    recommendations.push("Cenário estável. Mantenha o ritmo atual de produção e acompanhe o pipeline semanalmente.");
  }

  return {
    targetMonth: monthLabel(targetYear, targetMonth),
    targetYear,
    targetMonthNum: targetMonth,
    baseEstimate,
    pipelineValue,
    seasonalIndex,
    finalEstimate,
    confidenceLevel,
    confidenceLabel,
    lowerBound,
    upperBound,
    historicalMonths,
    pipelineJobs,
    factors,
    trendDirection,
    trendPercent,
    recommendations,
  };
}
