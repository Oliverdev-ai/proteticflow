/**
 * Relatórios — ProteticFlow
 * Página de relatórios com visualização prévia e exportação PDF/CSV.
 * Tipos: Produção, Financeiro, Estoque.
 * Exportação PDF via jsPDF + autoTable (client-side, sem servidor).
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileText, Download, Loader2, BarChart2, DollarSign,
  Package, TrendingUp, AlertTriangle, CheckCircle2,
  Calendar, ChevronDown, FileSpreadsheet, Printer,
  ArrowUpRight, ArrowDownRight, Minus, Sparkles,
  Target, Lightbulb, ThumbsUp, ThumbsDown, Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// ─── PDF Export ────────────────────────────────────────────

async function exportToPDF(
  type: "production" | "financial" | "stock",
  data: any,
  period: string
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(41, 98, 255);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");

  const titles = {
    production: "Relatório de Produção",
    financial: "Relatório Financeiro",
    stock: "Relatório de Estoque",
  };
  doc.text(titles[type], 14, 12);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Período: ${period}`, 14, 20);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, pageWidth - 14, 20, { align: "right" });

  doc.setTextColor(0, 0, 0);
  let y = 36;

  if (type === "production") {
    // KPIs
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo", 14, y); y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const kpis = [
      ["Total de Trabalhos", String(data.totalJobs)],
      ["Entregues", String(data.deliveredJobs)],
      ["Pendentes", String(data.pendingJobs)],
      ["Atrasados", String(data.overdueJobs)],
      ["Prazo Médio de Entrega", `${data.avgDeliveryDays} dias`],
    ];
    autoTable(doc, {
      startY: y,
      head: [["Indicador", "Valor"]],
      body: kpis,
      theme: "striped",
      headStyles: { fillColor: [41, 98, 255] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // By service
    if (data.byService?.length > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Por Serviço", 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Serviço", "Qtd", "Valor Total (R$)"]],
        body: data.byService.map((s: any) => [
          s.serviceName,
          String(s.count),
          s.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
        ]),
        theme: "striped",
        headStyles: { fillColor: [41, 98, 255] },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Jobs list
    if (data.jobsList?.length > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Lista de Trabalhos", 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Código", "Serviço", "Cliente", "Status", "Prazo", "Valor (R$)"]],
        body: data.jobsList.map((j: any) => [
          j.code,
          j.serviceName,
          j.clientName,
          j.status,
          new Date(j.deadline).toLocaleDateString("pt-BR"),
          parseFloat(j.price || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
        ]),
        theme: "striped",
        headStyles: { fillColor: [41, 98, 255] },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 7 },
      });
    }
  } else if (type === "financial") {
    const kpis = [
      ["Receita Total", `R$ ${data.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
      ["Recebido", `R$ ${data.receivedRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
      ["Pendente", `R$ ${data.pendingRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
      ["Vencido", `R$ ${data.overdueRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
      ["Resultado Líquido", `R$ ${data.netResult.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
    ];
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo Financeiro", 14, y); y += 6;
    autoTable(doc, {
      startY: y,
      head: [["Indicador", "Valor"]],
      body: kpis,
      theme: "striped",
      headStyles: { fillColor: [41, 98, 255] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    if (data.receivablesList?.length > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Contas a Receber", 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [["OS", "Cliente", "Valor (R$)", "Vencimento", "Status"]],
        body: data.receivablesList.map((r: any) => [
          r.jobCode,
          r.clientName,
          parseFloat(r.amount || "0").toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
          new Date(r.dueDate).toLocaleDateString("pt-BR"),
          r.status,
        ]),
        theme: "striped",
        headStyles: { fillColor: [41, 98, 255] },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8 },
      });
    }
  } else if (type === "stock") {
    const kpis = [
      ["Total de Materiais", String(data.totalMaterials)],
      ["Materiais em Alerta", String(data.lowStockCount)],
      ["Valor em Estoque", `R$ ${data.totalStockValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
      ["Total Consumido (período)", String(data.totalConsumed)],
      ["Total Recebido (período)", String(data.totalReceived)],
    ];
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo de Estoque", 14, y); y += 6;
    autoTable(doc, {
      startY: y,
      head: [["Indicador", "Valor"]],
      body: kpis,
      theme: "striped",
      headStyles: { fillColor: [41, 98, 255] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    if (data.topConsumed?.length > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Top Materiais Consumidos", 14, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Material", "Unidade", "Qtd Consumida", "Custo Total (R$)"]],
        body: data.topConsumed.map((m: any) => [
          m.materialName,
          m.unit,
          String(m.quantity),
          m.totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
        ]),
        theme: "striped",
        headStyles: { fillColor: [41, 98, 255] },
        margin: { left: 14, right: 14 },
      });
    }
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `ProteticFlow — Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  doc.save(`proteticflow-${type}-${period.replace("/", "-")}.pdf`);
}

// ─── CSV Export ────────────────────────────────────────────

function exportToCSV(type: "production" | "financial" | "stock", data: any, period: string) {
  let rows: string[][] = [];
  let headers: string[] = [];

  if (type === "production" && data.jobsList) {
    headers = ["Código", "Serviço", "Cliente", "Paciente", "Status", "Prazo", "Entregue em", "Valor (R$)", "Responsável"];
    rows = data.jobsList.map((j: any) => [
      j.code,
      j.serviceName,
      j.clientName,
      j.patientName ?? "",
      j.status,
      new Date(j.deadline).toLocaleDateString("pt-BR"),
      j.deliveredAt ? new Date(j.deliveredAt).toLocaleDateString("pt-BR") : "",
      parseFloat(j.price || "0").toFixed(2),
      j.assignedToName ?? "",
    ]);
  } else if (type === "financial" && data.receivablesList) {
    headers = ["OS", "Cliente", "Valor (R$)", "Vencimento", "Pago em", "Status", "Descrição"];
    rows = data.receivablesList.map((r: any) => [
      r.jobCode,
      r.clientName,
      parseFloat(r.amount || "0").toFixed(2),
      new Date(r.dueDate).toLocaleDateString("pt-BR"),
      r.paidAt ? new Date(r.paidAt).toLocaleDateString("pt-BR") : "",
      r.status,
      r.description ?? "",
    ]);
  } else if (type === "stock" && data.movementsList) {
    headers = ["Material", "Categoria", "Tipo", "Quantidade", "Custo Unit. (R$)", "Motivo", "Data"];
    rows = data.movementsList.map((m: any) => [
      m.materialName,
      m.categoryName,
      m.type,
      String(m.quantity),
      m.unitCost ?? "",
      m.reason ?? "",
      new Date(m.createdAt).toLocaleString("pt-BR"),
    ]);
  }

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `proteticflow-${type}-${period.replace("/", "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── KPI Card ──────────────────────────────────────────────

function KpiCard({
  label, value, sub, trend, color = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  color?: "default" | "success" | "danger" | "warning";
}) {
  const colorMap = {
    default: "bg-primary/5 border-primary/10",
    success: "bg-emerald-50 border-emerald-100",
    danger: "bg-red-50 border-red-100",
    warning: "bg-amber-50 border-amber-100",
  };
  const textMap = {
    default: "text-foreground",
    success: "text-emerald-700",
    danger: "text-red-700",
    warning: "text-amber-700",
  };
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-muted-foreground";

  return (
    <div className={`rounded-xl border p-3 ${colorMap[color]}`}>
      <p className="text-[10px] font-body text-muted-foreground mb-1">{label}</p>
      <div className="flex items-end gap-1">
        <p className={`text-xl font-heading font-bold ${textMap[color]}`}>{value}</p>
        {trend && <TrendIcon size={14} className={`mb-0.5 ${trendColor}`} />}
      </div>
      {sub && <p className="text-[10px] font-body text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Production Tab ────────────────────────────────────────

function ProductionTab({ year, month }: { year: number; month?: number }) {
  const { data, isLoading } = trpc.reports.production.useQuery({ year, month });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Total de Trabalhos" value={String(data.totalJobs)} />
        <KpiCard label="Entregues" value={String(data.deliveredJobs)} color="success" />
        <KpiCard label="Pendentes" value={String(data.pendingJobs)} color="warning" />
        <KpiCard label="Atrasados" value={String(data.overdueJobs)} color="danger" />
        <KpiCard label="Prazo Médio" value={`${data.avgDeliveryDays}d`} sub="da criação à entrega" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Service */}
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-heading">Top Serviços</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {data.byService.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Nenhum dado</p>
            ) : (
              <div className="space-y-2">
                {data.byService.slice(0, 8).map((s: any, i: number) => {
                  const maxCount = data.byService[0]?.count ?? 1;
                  const pct = (s.count / maxCount) * 100;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] font-body text-muted-foreground w-32 truncate shrink-0">{s.serviceName}</span>
                      <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                        <div className="h-full bg-primary/50 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-body font-semibold text-foreground w-6 text-right">{s.count}</span>
                      <span className="text-[10px] font-body text-muted-foreground w-20 text-right">
                        R$ {s.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Client */}
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-heading">Top Clientes</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {data.byClient.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Nenhum dado</p>
            ) : (
              <div className="space-y-2">
                {data.byClient.slice(0, 8).map((c: any, i: number) => {
                  const maxCount = data.byClient[0]?.count ?? 1;
                  const pct = (c.count / maxCount) * 100;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] font-body text-muted-foreground w-32 truncate shrink-0">{c.clientName}</span>
                      <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-body font-semibold text-foreground w-6 text-right">{c.count}</span>
                      <span className="text-[10px] font-body text-muted-foreground w-20 text-right">
                        R$ {c.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Jobs List */}
      <Card className="border-border/60">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-heading">Lista de Trabalhos ({data.jobsList.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[280px]">
            <table className="w-full text-xs font-body">
              <thead className="bg-muted/40 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Código</th>
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Serviço</th>
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Cliente</th>
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Prazo</th>
                  <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Valor</th>
                </tr>
              </thead>
              <tbody>
                {data.jobsList.map((j: any) => (
                  <tr key={j.id} className="border-t border-border/30 hover:bg-muted/20">
                    <td className="px-4 py-1.5 font-mono font-semibold">{j.code}</td>
                    <td className="px-4 py-1.5 max-w-[140px] truncate">{j.serviceName}</td>
                    <td className="px-4 py-1.5 max-w-[120px] truncate text-muted-foreground">{j.clientName}</td>
                    <td className="px-4 py-1.5">
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{j.status}</Badge>
                    </td>
                    <td className="px-4 py-1.5 text-muted-foreground">{new Date(j.deadline).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-1.5 text-right font-semibold">R$ {parseFloat(j.price || "0").toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Financial Tab ─────────────────────────────────────────

function FinancialTab({ year, month }: { year: number; month?: number }) {
  const { data, isLoading } = trpc.reports.financial.useQuery({ year, month });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>;
  if (!data) return null;

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Receita Total" value={fmt(data.totalRevenue)} />
        <KpiCard label="Recebido" value={fmt(data.receivedRevenue)} color="success" trend="up" />
        <KpiCard label="Pendente" value={fmt(data.pendingRevenue)} color="warning" />
        <KpiCard label="Vencido" value={fmt(data.overdueRevenue)} color="danger" trend="down" />
        <KpiCard
          label="Resultado Líquido"
          value={fmt(data.netResult)}
          color={data.netResult >= 0 ? "success" : "danger"}
          trend={data.netResult >= 0 ? "up" : "down"}
        />
      </div>

      {/* Monthly Trend */}
      <Card className="border-border/60">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-heading">Tendência Mensal (6 meses)</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {data.monthlyTrend.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Nenhum dado</p>
          ) : (
            <div className="space-y-2">
              {data.monthlyTrend.map((m: any, i: number) => {
                const maxRev = Math.max(...data.monthlyTrend.map((x: any) => x.revenue), 1);
                const pctTotal = (m.revenue / maxRev) * 100;
                const pctReceived = m.revenue > 0 ? (m.received / m.revenue) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[10px] font-body text-muted-foreground w-14 shrink-0">{m.month}</span>
                    <div className="flex-1 relative h-4 bg-muted/40 rounded-full overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-primary/20 rounded-full" style={{ width: `${pctTotal}%` }} />
                      <div className="absolute inset-y-0 left-0 bg-emerald-400/70 rounded-full" style={{ width: `${pctTotal * pctReceived / 100}%` }} />
                    </div>
                    <div className="text-right w-28 shrink-0">
                      <span className="text-[10px] font-body font-semibold text-foreground">
                        {fmt(m.revenue)}
                      </span>
                      <span className="text-[9px] font-body text-emerald-600 ml-1">
                        ({fmt(m.received)})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receivables List */}
      <Card className="border-border/60">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-heading">Contas a Receber ({data.receivablesList.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[260px]">
            <table className="w-full text-xs font-body">
              <thead className="bg-muted/40 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">OS</th>
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Cliente</th>
                  <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Valor</th>
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Vencimento</th>
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.receivablesList.map((r: any) => (
                  <tr key={r.id} className="border-t border-border/30 hover:bg-muted/20">
                    <td className="px-4 py-1.5 font-mono font-semibold">{r.jobCode}</td>
                    <td className="px-4 py-1.5 max-w-[140px] truncate text-muted-foreground">{r.clientName}</td>
                    <td className="px-4 py-1.5 text-right font-semibold">R$ {parseFloat(r.amount || "0").toFixed(2)}</td>
                    <td className="px-4 py-1.5 text-muted-foreground">{new Date(r.dueDate).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 h-4 ${r.status === "paid" ? "border-emerald-300 text-emerald-700" : r.status === "overdue" ? "border-red-300 text-red-700" : ""}`}
                      >
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Stock Tab ─────────────────────────────────────────────

function StockTab({ year, month }: { year: number; month?: number }) {
  const { data, isLoading } = trpc.reports.stock.useQuery({ year, month });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Total de Materiais" value={String(data.totalMaterials)} />
        <KpiCard label="Em Alerta" value={String(data.lowStockCount)} color={data.lowStockCount > 0 ? "danger" : "success"} />
        <KpiCard label="Valor em Estoque" value={`R$ ${data.totalStockValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`} color="default" />
        <KpiCard label="Consumido (período)" value={String(data.totalConsumed)} sub="unidades" />
        <KpiCard label="Recebido (período)" value={String(data.totalReceived)} sub="unidades" color="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Consumed */}
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-heading">Top Consumidos</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {data.topConsumed.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma saída no período</p>
            ) : (
              <div className="space-y-2">
                {data.topConsumed.map((m: any, i: number) => {
                  const maxQty = data.topConsumed[0]?.quantity ?? 1;
                  const pct = (m.quantity / maxQty) * 100;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] font-body text-muted-foreground w-28 truncate shrink-0">{m.materialName}</span>
                      <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-body font-semibold text-foreground w-12 text-right">{m.quantity} {m.unit}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Category */}
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-heading">Por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {data.byCategory.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Nenhum dado</p>
            ) : (
              <div className="space-y-2">
                {data.byCategory.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                    <span className="text-xs font-body">{c.categoryName}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-body text-muted-foreground">{c.materialCount} mat.</span>
                      <span className="text-xs font-body font-semibold">R$ {c.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Movements List */}
      <Card className="border-border/60">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-heading">Movimentações ({data.movementsList.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[240px]">
            <table className="w-full text-xs font-body">
              <thead className="bg-muted/40 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Material</th>
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Tipo</th>
                  <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Qtd</th>
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Motivo</th>
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody>
                {data.movementsList.map((m: any) => (
                  <tr key={m.id} className="border-t border-border/30 hover:bg-muted/20">
                    <td className="px-4 py-1.5 max-w-[140px] truncate">{m.materialName}</td>
                    <td className="px-4 py-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 h-4 ${m.type === "in" ? "border-emerald-300 text-emerald-700" : m.type === "out" ? "border-red-300 text-red-700" : "border-blue-300 text-blue-700"}`}
                      >
                        {m.type === "in" ? "Entrada" : m.type === "out" ? "Saída" : "Ajuste"}
                      </Badge>
                    </td>
                    <td className="px-4 py-1.5 text-right font-semibold">{m.quantity}</td>
                    <td className="px-4 py-1.5 text-muted-foreground max-w-[120px] truncate">{m.reason ?? "—"}</td>
                    <td className="px-4 py-1.5 text-muted-foreground">{new Date(m.createdAt).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Prediction Widget ────────────────────────────────────

function PredictionWidget() {
  const { data, isLoading, error } = trpc.reports.predict.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="animate-spin text-primary" size={28} />
        <p className="text-sm text-muted-foreground font-body">Calculando previsão com base nos dados históricos...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertTriangle size={32} className="text-amber-400" />
        <p className="text-sm text-muted-foreground font-body text-center max-w-sm">
          Não foi possível gerar a previsão. Adicione dados de receita para ativar o modelo preditivo.
        </p>
      </div>
    );
  }

  const confidenceColor = data.confidenceLevel >= 70
    ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : data.confidenceLevel >= 45
    ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-red-600 bg-red-50 border-red-200";

  const trendIcon = data.trendDirection === "crescente"
    ? <ArrowUpRight size={14} className="text-emerald-500" />
    : data.trendDirection === "decrescente"
    ? <ArrowDownRight size={14} className="text-red-500" />
    : <Minus size={14} className="text-muted-foreground" />;

  const trendColor = data.trendDirection === "crescente"
    ? "text-emerald-600"
    : data.trendDirection === "decrescente"
    ? "text-red-600"
    : "text-muted-foreground";

  return (
    <div className="space-y-4">
      {/* Main prediction card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background overflow-hidden">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-primary" />
                <span className="text-xs font-body text-muted-foreground uppercase tracking-wider">Previsão de Receita</span>
              </div>
              <p className="text-3xl font-heading font-bold text-foreground">
                R$ {data.finalEstimate.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs font-body text-muted-foreground mt-1">
                Intervalo: R$ {data.lowerBound.toLocaleString("pt-BR", { minimumFractionDigits: 0 })} – R$ {data.upperBound.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs font-body text-muted-foreground">
                Estimativa para <span className="font-semibold text-foreground">{data.targetMonth}</span>
              </p>
            </div>
            <div className={`rounded-xl border px-4 py-3 text-center ${confidenceColor}`}>
              <p className="text-2xl font-heading font-bold">{data.confidenceLevel}%</p>
              <p className="text-[10px] font-body font-semibold uppercase tracking-wider">Confiança {data.confidenceLabel}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-[10px] font-body text-muted-foreground mb-1">
              <span>0%</span><span>Confiança do Modelo</span><span>100%</span>
            </div>
            <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${
                data.confidenceLevel >= 70 ? "bg-emerald-400" : data.confidenceLevel >= 45 ? "bg-amber-400" : "bg-red-400"
              }`} style={{ width: `${data.confidenceLevel}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Base WMA (6 meses)" value={`R$ ${data.baseEstimate.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`} sub="Média móvel ponderada" />
        <KpiCard label="Pipeline Ativo" value={`R$ ${data.pipelineValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`} sub={`${data.pipelineJobs.length} trabalho(s) no prazo`} color={data.pipelineJobs.length > 0 ? "success" : "default"} />
        <KpiCard label="Índice Sazonal" value={data.seasonalIndex.toFixed(2)} sub={data.seasonalIndex > 1.05 ? "Alta temporada" : data.seasonalIndex < 0.95 ? "Baixa temporada" : "Temporada neutra"} color={data.seasonalIndex > 1.05 ? "success" : data.seasonalIndex < 0.95 ? "warning" : "default"} />
        <div className="rounded-xl border p-3 bg-muted/30">
          <p className="text-[10px] font-body text-muted-foreground mb-1">Tendência</p>
          <div className="flex items-end gap-1">
            <p className={`text-xl font-heading font-bold ${trendColor}`}>{data.trendPercent > 0 ? "+" : ""}{data.trendPercent}%</p>
            {trendIcon}
          </div>
          <p className="text-[10px] font-body text-muted-foreground mt-0.5 capitalize">{data.trendDirection}</p>
        </div>
      </div>

      {/* Historical trend */}
      <Card className="border-border/60">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <TrendingUp size={14} className="text-primary" />
            Histórico (6 meses)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {data.historicalMonths.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Sem dados históricos</p>
          ) : (
            <div className="space-y-2">
              {data.historicalMonths.map((m: any, i: number) => {
                const maxVal = Math.max(...data.historicalMonths.map((x: any) => x.totalRevenue), 1);
                const pct = maxVal > 0 ? (m.totalRevenue / maxVal) * 100 : 0;
                const receivedPct = m.totalRevenue > 0 ? (m.receivedRevenue / m.totalRevenue) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[10px] font-body text-muted-foreground w-14 shrink-0 text-right">{m.label}</span>
                    <div className="flex-1 h-5 bg-muted/40 rounded overflow-hidden relative">
                      <div className="h-full bg-primary/20 rounded" style={{ width: `${pct}%` }} />
                      <div className="absolute top-0 left-0 h-full bg-primary/60 rounded" style={{ width: `${pct * receivedPct / 100}%` }} />
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-body font-semibold text-foreground">R$ {m.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</p>
                      <p className="text-[9px] font-body text-muted-foreground">{m.jobCount} trabalhos</p>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-3 pt-1">
                <span className="text-[10px] font-body text-muted-foreground w-14 shrink-0 text-right">Legenda:</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1"><div className="w-3 h-2 bg-primary/60 rounded" /><span className="text-[9px] font-body text-muted-foreground">Recebido</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-2 bg-primary/20 rounded" /><span className="text-[9px] font-body text-muted-foreground">Total faturado</span></div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Factors + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-heading flex items-center gap-2">
              <Target size={14} className="text-primary" />
              Fatores Identificados
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {data.factors.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Nenhum fator identificado</p>
            ) : (
              <div className="space-y-2">
                {data.factors.map((f: any, i: number) => (
                  <div key={i} className={`flex items-start gap-2 p-2 rounded-lg border ${
                    f.type === "positive" ? "bg-emerald-50 border-emerald-100" : f.type === "negative" ? "bg-red-50 border-red-100" : "bg-muted/30 border-border/40"
                  }`}>
                    {f.type === "positive" ? <ThumbsUp size={12} className="text-emerald-500 mt-0.5 shrink-0" /> : f.type === "negative" ? <ThumbsDown size={12} className="text-red-500 mt-0.5 shrink-0" /> : <Info size={12} className="text-muted-foreground mt-0.5 shrink-0" />}
                    <div>
                      <p className="text-[11px] font-body font-semibold text-foreground">{f.label}</p>
                      <p className="text-[10px] font-body text-muted-foreground">{f.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-heading flex items-center gap-2">
              <Lightbulb size={14} className="text-amber-500" />
              Recomendações
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-2">
              {data.recommendations.map((rec: string, i: number) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-100">
                  <span className="text-amber-500 font-bold text-xs shrink-0 mt-0.5">{i + 1}.</span>
                  <p className="text-[11px] font-body text-foreground">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline jobs */}
      {data.pipelineJobs.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-heading">Pipeline para {data.targetMonth} ({data.pipelineJobs.length} trabalhos)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[180px]">
              <table className="w-full text-xs font-body">
                <thead className="bg-muted/40 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Código</th>
                    <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Serviço</th>
                    <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Cliente</th>
                    <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Valor</th>
                    <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Prazo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pipelineJobs.map((j: any) => (
                    <tr key={j.id} className="border-t border-border/30 hover:bg-muted/20">
                      <td className="px-4 py-1.5 font-mono text-[10px]">{j.code}</td>
                      <td className="px-4 py-1.5 max-w-[140px] truncate">{j.serviceName}</td>
                      <td className="px-4 py-1.5 text-muted-foreground max-w-[120px] truncate">{j.clientName ?? "—"}</td>
                      <td className="px-4 py-1.5 text-right font-semibold">R$ {j.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-1.5 text-muted-foreground">{new Date(j.deadline).toLocaleDateString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


// ─── Main Relatorios Page ──────────────────────────────────

const MONTHS = [
  { value: "1", label: "Janeiro" }, { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" }, { value: "4", label: "Abril" },
  { value: "5", label: "Maio" }, { value: "6", label: "Junho" },
  { value: "7", label: "Julho" }, { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" }, { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
];

export default function Relatorios() {
  const now = new Date();
  const [activeTab, setActiveTab] = useState<"production" | "financial" | "stock" | "predict">("production");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<string>(String(now.getMonth() + 1));
  const [isExporting, setIsExporting] = useState(false);

  const selectedMonth = month === "all" ? undefined : parseInt(month);
  const period = selectedMonth
    ? `${String(selectedMonth).padStart(2, "0")}/${year}`
    : String(year);

  const { data: prodData } = trpc.reports.production.useQuery({ year, month: selectedMonth }, { enabled: activeTab === "production" });
  const { data: finData } = trpc.reports.financial.useQuery({ year, month: selectedMonth }, { enabled: activeTab === "financial" });
  const { data: stockData } = trpc.reports.stock.useQuery({ year, month: selectedMonth }, { enabled: activeTab === "stock" });

  const currentData = activeTab === "production" ? prodData : activeTab === "financial" ? finData : activeTab === "stock" ? stockData : null;

  const handleExportPDF = async () => {
    if (!currentData || activeTab === "predict") { toast.error("Aguarde o carregamento dos dados."); return; }
    setIsExporting(true);
    try {
      await exportToPDF(activeTab as "production" | "financial" | "stock", currentData, period);
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      toast.error("Erro ao gerar PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    if (!currentData || activeTab === "predict") { toast.error("Aguarde o carregamento dos dados."); return; }
    try {
      exportToCSV(activeTab as "production" | "financial" | "stock", currentData, period);
      toast.success("CSV exportado!");
    } catch (err) {
      toast.error("Erro ao exportar CSV.");
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <FileText size={22} className="text-primary" />
            Relatórios
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Análise de produção, financeiro e estoque com exportação PDF/CSV
          </p>
        </div>

        {/* Period Selector + Export */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-[90px] h-8 text-xs font-body">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[130px] h-8 text-xs font-body">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Ano completo</SelectItem>
              {MONTHS.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="text-xs font-body gap-1.5 h-8"
            onClick={handleExportCSV}
            disabled={!currentData}
          >
            <FileSpreadsheet size={13} />
            CSV
          </Button>

          <Button
            size="sm"
            className="text-xs font-body gap-1.5 h-8"
            onClick={handleExportPDF}
            disabled={isExporting || !currentData}
          >
            {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            PDF
          </Button>
        </div>
      </div>

      {/* Period Badge */}
      <div className="flex items-center gap-2">
        <Calendar size={13} className="text-muted-foreground" />
        <span className="text-xs font-body text-muted-foreground">
          Período: <span className="font-semibold text-foreground">{period}</span>
        </span>
      </div>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="production" className="gap-1.5 text-xs">
            <BarChart2 size={13} />
            Produção
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-1.5 text-xs">
            <DollarSign size={13} />
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-1.5 text-xs">
            <Package size={13} />
            Estoque
          </TabsTrigger>
          <TabsTrigger value="predict" className="gap-1.5 text-xs">
            <Sparkles size={13} />
            Previsão IA
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="production">
            <ProductionTab year={year} month={selectedMonth} />
          </TabsContent>
          <TabsContent value="financial">
            <FinancialTab year={year} month={selectedMonth} />
          </TabsContent>
          <TabsContent value="stock">
            <StockTab year={year} month={selectedMonth} />
          </TabsContent>
          <TabsContent value="predict">
            <PredictionWidget />
          </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  );
}
