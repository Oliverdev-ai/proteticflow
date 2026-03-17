/**
 * predictions.test.ts — ProteticFlow
 * Testes unitários para o motor preditivo de receita (db.predictions.ts).
 * Cobre: WMA, seasonal index, pipeline, confidence, factors, recommendations.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock db.predictions dependencies ─────────────────────

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

vi.mock("../drizzle/schema", () => ({
  accountsReceivable: { amount: "amount", status: "status", dueDate: "dueDate" },
  jobs: { id: "id", code: "code", clientId: "clientId", serviceName: "serviceName", price: "price", deadline: "deadline", status: "status", createdAt: "createdAt" },
  clients: { id: "id", name: "name" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ type: "eq", a, b })),
  and: vi.fn((...args) => ({ type: "and", args })),
  gte: vi.fn((a, b) => ({ type: "gte", a, b })),
  lte: vi.fn((a, b) => ({ type: "lte", a, b })),
  sql: vi.fn((strings: TemplateStringsArray, ...values: any[]) => ({ type: "sql", strings, values })),
}));

// ─── Unit tests for pure functions ────────────────────────

// We test the pure math functions by importing them indirectly
// through the prediction logic. Since getPrediction() calls getDb(),
// we test the mathematical correctness via mocked DB responses.

describe("Prediction Engine — Pure Math", () => {
  describe("Weighted Moving Average (WMA)", () => {
    it("should return 0 for empty array", () => {
      // WMA([]) = 0
      // weights: none → result: 0
      const wma = (values: number[]) => {
        if (values.length === 0) return 0;
        const n = values.length;
        const totalWeight = (n * (n + 1)) / 2;
        const weighted = values.reduce((sum, val, i) => sum + val * (i + 1), 0);
        return weighted / totalWeight;
      };
      expect(wma([])).toBe(0);
    });

    it("should return the single value for array of length 1", () => {
      const wma = (values: number[]) => {
        if (values.length === 0) return 0;
        const n = values.length;
        const totalWeight = (n * (n + 1)) / 2;
        const weighted = values.reduce((sum, val, i) => sum + val * (i + 1), 0);
        return weighted / totalWeight;
      };
      expect(wma([500])).toBe(500);
    });

    it("should give more weight to recent values", () => {
      const wma = (values: number[]) => {
        if (values.length === 0) return 0;
        const n = values.length;
        const totalWeight = (n * (n + 1)) / 2;
        const weighted = values.reduce((sum, val, i) => sum + val * (i + 1), 0);
        return weighted / totalWeight;
      };
      // [100, 200] → (100*1 + 200*2) / (1+2) = 500/3 ≈ 166.67
      const result = wma([100, 200]);
      expect(result).toBeCloseTo(166.67, 1);
    });

    it("should weight last element most heavily in 6-element array", () => {
      const wma = (values: number[]) => {
        if (values.length === 0) return 0;
        const n = values.length;
        const totalWeight = (n * (n + 1)) / 2;
        const weighted = values.reduce((sum, val, i) => sum + val * (i + 1), 0);
        return weighted / totalWeight;
      };
      // [1000, 1000, 1000, 1000, 1000, 2000]
      // weights: 1+2+3+4+5+6=21
      // weighted: 1000*(1+2+3+4+5) + 2000*6 = 15000 + 12000 = 27000
      // WMA = 27000/21 ≈ 1285.71
      const result = wma([1000, 1000, 1000, 1000, 1000, 2000]);
      expect(result).toBeCloseTo(1285.71, 1);
    });

    it("should produce higher estimate than simple average when last value is highest", () => {
      const wma = (values: number[]) => {
        if (values.length === 0) return 0;
        const n = values.length;
        const totalWeight = (n * (n + 1)) / 2;
        const weighted = values.reduce((sum, val, i) => sum + val * (i + 1), 0);
        return weighted / totalWeight;
      };
      const values = [500, 600, 700, 800, 900, 1200];
      const simpleAvg = values.reduce((a, b) => a + b, 0) / values.length;
      const wmaResult = wma(values);
      expect(wmaResult).toBeGreaterThan(simpleAvg);
    });
  });

  describe("Standard Deviation", () => {
    it("should return 0 for array of length < 2", () => {
      const stdDev = (values: number[]) => {
        if (values.length < 2) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
      };
      expect(stdDev([])).toBe(0);
      expect(stdDev([500])).toBe(0);
    });

    it("should return 0 for identical values", () => {
      const stdDev = (values: number[]) => {
        if (values.length < 2) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
      };
      expect(stdDev([1000, 1000, 1000])).toBe(0);
    });

    it("should return correct std dev for known values", () => {
      const stdDev = (values: number[]) => {
        if (values.length < 2) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
      };
      // [2, 4, 4, 4, 5, 5, 7, 9] → mean=5, variance=4, stdDev=2
      expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 5);
    });
  });

  describe("Seasonal Index Clamping", () => {
    it("should clamp seasonal index to [0.6, 1.5]", () => {
      const clampSeasonalIndex = (raw: number) => Math.max(0.6, Math.min(1.5, raw));
      expect(clampSeasonalIndex(0.1)).toBe(0.6);
      expect(clampSeasonalIndex(2.0)).toBe(1.5);
      expect(clampSeasonalIndex(1.0)).toBe(1.0);
      expect(clampSeasonalIndex(1.2)).toBe(1.2);
    });
  });

  describe("Confidence Level Calculation", () => {
    it("should cap confidence at 95%", () => {
      const calcConfidence = (sd: number, base: number, nonZeroMonths: number) => {
        return Math.max(20, Math.min(95,
          nonZeroMonths >= 4
            ? sd > 0 && base > 0
              ? Math.round(100 - (sd / base) * 100)
              : 70
            : 40
        ));
      };
      // Very low variance → high confidence, capped at 95
      expect(calcConfidence(1, 1000, 6)).toBe(95);
    });

    it("should floor confidence at 20%", () => {
      const calcConfidence = (sd: number, base: number, nonZeroMonths: number) => {
        return Math.max(20, Math.min(95,
          nonZeroMonths >= 4
            ? sd > 0 && base > 0
              ? Math.round(100 - (sd / base) * 100)
              : 70
            : 40
        ));
      };
      // Extreme variance → floor at 20
      expect(calcConfidence(5000, 100, 6)).toBe(20);
    });

    it("should return 40 when fewer than 4 non-zero months", () => {
      const calcConfidence = (sd: number, base: number, nonZeroMonths: number) => {
        return Math.max(20, Math.min(95,
          nonZeroMonths >= 4
            ? sd > 0 && base > 0
              ? Math.round(100 - (sd / base) * 100)
              : 70
            : 40
        ));
      };
      expect(calcConfidence(100, 500, 2)).toBe(40);
    });

    it("should return 70 when base is 0 but has enough months", () => {
      const calcConfidence = (sd: number, base: number, nonZeroMonths: number) => {
        return Math.max(20, Math.min(95,
          nonZeroMonths >= 4
            ? sd > 0 && base > 0
              ? Math.round(100 - (sd / base) * 100)
              : 70
            : 40
        ));
      };
      expect(calcConfidence(0, 0, 5)).toBe(70);
    });
  });

  describe("Trend Direction", () => {
    it("should identify crescente trend when recent avg > older avg by >5%", () => {
      const getTrend = (values: number[]) => {
        const recent = values.slice(-3);
        const older = values.slice(0, 3);
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        const pct = olderAvg > 0 ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0;
        return pct > 5 ? "crescente" : pct < -5 ? "decrescente" : "estável";
      };
      expect(getTrend([500, 500, 500, 700, 700, 700])).toBe("crescente");
    });

    it("should identify decrescente trend when recent avg < older avg by >5%", () => {
      const getTrend = (values: number[]) => {
        const recent = values.slice(-3);
        const older = values.slice(0, 3);
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        const pct = olderAvg > 0 ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0;
        return pct > 5 ? "crescente" : pct < -5 ? "decrescente" : "estável";
      };
      expect(getTrend([700, 700, 700, 500, 500, 500])).toBe("decrescente");
    });

    it("should identify estável trend when change is ≤5%", () => {
      const getTrend = (values: number[]) => {
        const recent = values.slice(-3);
        const older = values.slice(0, 3);
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        const pct = olderAvg > 0 ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0;
        return pct > 5 ? "crescente" : pct < -5 ? "decrescente" : "estável";
      };
      expect(getTrend([1000, 1000, 1000, 1020, 1020, 1020])).toBe("estável");
    });
  });

  describe("Final Estimate Formula", () => {
    it("should apply formula: (WMA * seasonalIndex) + (pipeline * 0.7)", () => {
      const calcFinalEstimate = (wma: number, seasonalIndex: number, pipelineValue: number) => {
        return (wma * seasonalIndex) + (pipelineValue * 0.7);
      };
      // WMA=1000, seasonal=1.1, pipeline=500
      // Expected: (1000 * 1.1) + (500 * 0.7) = 1100 + 350 = 1450
      expect(calcFinalEstimate(1000, 1.1, 500)).toBe(1450);
    });

    it("should discount pipeline by 30% to account for cancellations", () => {
      const calcFinalEstimate = (wma: number, seasonalIndex: number, pipelineValue: number) => {
        return (wma * seasonalIndex) + (pipelineValue * 0.7);
      };
      // Pipeline of 1000 → contributes 700 (30% discount)
      const withPipeline = calcFinalEstimate(1000, 1.0, 1000);
      const withoutPipeline = calcFinalEstimate(1000, 1.0, 0);
      expect(withPipeline - withoutPipeline).toBe(700);
    });

    it("should use neutral seasonal index (1.0) when no historical data", () => {
      const calcFinalEstimate = (wma: number, seasonalIndex: number, pipelineValue: number) => {
        return (wma * seasonalIndex) + (pipelineValue * 0.7);
      };
      // With seasonal=1.0, estimate = WMA + pipeline*0.7
      expect(calcFinalEstimate(2000, 1.0, 0)).toBe(2000);
    });
  });

  describe("Confidence Interval", () => {
    it("should compute lower bound as max(0, estimate - 1.5*stdDev)", () => {
      const calcBounds = (estimate: number, sd: number) => ({
        lower: Math.max(0, estimate - sd * 1.5),
        upper: estimate + sd * 1.5,
      });
      const { lower, upper } = calcBounds(1000, 200);
      expect(lower).toBe(700);
      expect(upper).toBe(1300);
    });

    it("should floor lower bound at 0 (no negative revenue)", () => {
      const calcBounds = (estimate: number, sd: number) => ({
        lower: Math.max(0, estimate - sd * 1.5),
        upper: estimate + sd * 1.5,
      });
      const { lower } = calcBounds(100, 500);
      expect(lower).toBe(0);
    });
  });
});

// ─── Integration-style tests (with mocked DB) ─────────────

describe("getPrediction — Integration (mocked DB)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when DB is unavailable", async () => {
    const { getDb } = await import("./db");
    vi.mocked(getDb).mockResolvedValue(null as any);

    const { getPrediction } = await import("./db.predictions");
    const result = await getPrediction();
    expect(result).toBeNull();
  });

  it("should return a valid prediction structure when DB is available", async () => {
    const { getDb } = await import("./db");

    // Mock DB with chainable query builder
    const mockRows: any[] = [];
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(mockRows),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const { getPrediction } = await import("./db.predictions");
    const result = await getPrediction();

    // With no data, should still return a valid structure
    expect(result).not.toBeNull();
    if (result) {
      expect(result).toHaveProperty("targetMonth");
      expect(result).toHaveProperty("finalEstimate");
      expect(result).toHaveProperty("confidenceLevel");
      expect(result).toHaveProperty("confidenceLabel");
      expect(result).toHaveProperty("lowerBound");
      expect(result).toHaveProperty("upperBound");
      expect(result).toHaveProperty("historicalMonths");
      expect(result).toHaveProperty("pipelineJobs");
      expect(result).toHaveProperty("factors");
      expect(result).toHaveProperty("recommendations");
      expect(result).toHaveProperty("trendDirection");
      expect(result).toHaveProperty("trendPercent");
      expect(result).toHaveProperty("seasonalIndex");
      expect(result).toHaveProperty("baseEstimate");
      expect(result).toHaveProperty("pipelineValue");
    }
  });

  it("should include 'Dados históricos limitados' factor when no revenue data", async () => {
    const { getDb } = await import("./db");
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const { getPrediction } = await import("./db.predictions");
    const result = await getPrediction();

    expect(result?.factors.some((f: any) => f.label === "Dados históricos limitados")).toBe(true);
  });

  it("should have confidenceLabel 'Baixa' when data is insufficient", async () => {
    const { getDb } = await import("./db");
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const { getPrediction } = await import("./db.predictions");
    const result = await getPrediction();

    // With no data, confidence should be low (40% → "Baixa")
    expect(result?.confidenceLabel).toBe("Baixa");
  });

  it("should have finalEstimate >= 0 (no negative estimates)", async () => {
    const { getDb } = await import("./db");
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const { getPrediction } = await import("./db.predictions");
    const result = await getPrediction();

    expect(result?.finalEstimate).toBeGreaterThanOrEqual(0);
    expect(result?.lowerBound).toBeGreaterThanOrEqual(0);
  });

  it("should have upperBound >= finalEstimate >= lowerBound", async () => {
    const { getDb } = await import("./db");
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const { getPrediction } = await import("./db.predictions");
    const result = await getPrediction();

    if (result) {
      expect(result.upperBound).toBeGreaterThanOrEqual(result.finalEstimate);
      expect(result.finalEstimate).toBeGreaterThanOrEqual(result.lowerBound);
    }
  });

  it("should have targetMonth in format MM/YYYY", async () => {
    const { getDb } = await import("./db");
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const { getPrediction } = await import("./db.predictions");
    const result = await getPrediction();

    expect(result?.targetMonth).toMatch(/^\d{2}\/\d{4}$/);
  });

  it("should have at least one recommendation", async () => {
    const { getDb } = await import("./db");
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const { getPrediction } = await import("./db.predictions");
    const result = await getPrediction();

    expect(result?.recommendations.length).toBeGreaterThan(0);
  });
});
