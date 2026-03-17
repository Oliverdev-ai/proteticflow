/**
 * pdf.engine.ts — ProteticFlow
 * Engine de geração de PDF server-side usando jsPDF + jspdf-autotable.
 * Responsável por: header com logo/nome/CNPJ, tabelas de dados, footer paginado.
 *
 * Arquitetura:
 *  - PdfBuilder: classe fluente para construir PDFs de forma composável
 *  - Funções de relatório específicas chamam PdfBuilder
 *  - Retorna Buffer (base64) para envio via tRPC
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { LabSettings } from "../drizzle/schema";

// ─── Types ────────────────────────────────────────────────

export interface PdfTableColumn {
  header: string;
  dataKey: string;
  width?: number;
  align?: "left" | "center" | "right";
}

export interface PdfSection {
  title?: string;
  subtitle?: string;
  table?: {
    columns: PdfTableColumn[];
    rows: Record<string, any>[];
    summary?: { label: string; value: string }[];
  };
  kpis?: { label: string; value: string; sub?: string }[];
  text?: string;
  spacer?: number; // mm
}

export interface PdfDocumentOptions {
  title: string;
  subtitle?: string;
  period?: string;
  sections: PdfSection[];
  lab: Pick<LabSettings, "labName" | "cnpj" | "phone" | "email" | "address" | "city" | "state" | "logoUrl" | "reportHeader" | "reportFooter" | "primaryColor">;
}

// ─── Color Helpers ────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return [26, 86, 219];
  return [r, g, b];
}

// ─── PdfBuilder ───────────────────────────────────────────

export class PdfBuilder {
  private doc: jsPDF;
  private primaryRgb: [number, number, number];
  private pageWidth: number;
  private pageHeight: number;
  private margin = 14;
  private headerHeight = 36;
  private footerHeight = 12;
  private currentY = 0;
  private lab: PdfDocumentOptions["lab"];
  private pageCount = 0;

  constructor(lab: PdfDocumentOptions["lab"]) {
    this.doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    this.lab = lab;
    this.primaryRgb = hexToRgb(lab.primaryColor ?? "#1a56db");
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.currentY = this.headerHeight + 6;
  }

  // ─── Header ─────────────────────────────────────────────

  private drawHeader(title: string, subtitle?: string, period?: string) {
    const doc = this.doc;
    const [r, g, b] = this.primaryRgb;

    // Background bar
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, this.pageWidth, this.headerHeight, "F");

    // Logo (if available — base64 or URL skipped server-side, use text fallback)
    // Lab name
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(this.lab.labName ?? "Laboratório", this.margin, 12);

    // CNPJ / contact
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const contactParts: string[] = [];
    if (this.lab.cnpj) contactParts.push(`CNPJ: ${this.lab.cnpj}`);
    if (this.lab.phone) contactParts.push(this.lab.phone);
    if (this.lab.email) contactParts.push(this.lab.email);
    if (this.lab.city && this.lab.state) contactParts.push(`${this.lab.city} - ${this.lab.state}`);
    if (contactParts.length > 0) {
      doc.text(contactParts.join("  |  "), this.margin, 18);
    }

    // Custom header text
    if (this.lab.reportHeader) {
      doc.setFontSize(7);
      doc.text(this.lab.reportHeader, this.margin, 23);
    }

    // Report title (right side)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, this.pageWidth - this.margin, 12, { align: "right" });

    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(subtitle, this.pageWidth - this.margin, 18, { align: "right" });
    }

    if (period) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Período: ${period}`, this.pageWidth - this.margin, 24, { align: "right" });
    }

    // Generation date
    doc.setFontSize(7);
    const genDate = new Date().toLocaleString("pt-BR");
    doc.text(`Gerado em: ${genDate}`, this.pageWidth - this.margin, 30, { align: "right" });

    // Separator line
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.line(this.margin, this.headerHeight - 2, this.pageWidth - this.margin, this.headerHeight - 2);

    doc.setTextColor(0, 0, 0);
  }

  // ─── Footer ─────────────────────────────────────────────

  private drawFooter(pageNum: number, totalPages: number) {
    const doc = this.doc;
    const y = this.pageHeight - this.footerHeight;
    const [r, g, b] = this.primaryRgb;

    // Footer line
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.5);
    doc.line(this.margin, y, this.pageWidth - this.margin, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);

    // Footer text (left)
    const footerText = this.lab.reportFooter ?? "Documento gerado pelo ProteticFlow";
    doc.text(footerText, this.margin, y + 4);

    // Page number (right)
    doc.text(`Página ${pageNum} de ${totalPages}`, this.pageWidth - this.margin, y + 4, { align: "right" });

    doc.setTextColor(0, 0, 0);
  }

  // ─── Section Title ────────────────────────────────────────

  addSectionTitle(title: string, subtitle?: string) {
    const doc = this.doc;
    const [r, g, b] = this.primaryRgb;

    // Check page break
    if (this.currentY > this.pageHeight - this.footerHeight - 20) {
      this.addPage();
    }

    doc.setFillColor(r, g, b);
    doc.setDrawColor(r, g, b);
    doc.rect(this.margin, this.currentY, 3, 7, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(r, g, b);
    doc.text(title, this.margin + 5, this.currentY + 5.5);

    doc.setTextColor(0, 0, 0);
    this.currentY += 9;

    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(subtitle, this.margin + 5, this.currentY);
      doc.setTextColor(0, 0, 0);
      this.currentY += 6;
    }
  }

  // ─── KPI Cards ────────────────────────────────────────────

  addKpiRow(kpis: { label: string; value: string; sub?: string }[]) {
    const doc = this.doc;
    const [r, g, b] = this.primaryRgb;

    if (this.currentY > this.pageHeight - this.footerHeight - 25) {
      this.addPage();
    }

    const cardWidth = (this.pageWidth - this.margin * 2 - (kpis.length - 1) * 4) / kpis.length;
    let x = this.margin;

    kpis.forEach((kpi) => {
      // Card background
      doc.setFillColor(245, 247, 255);
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, this.currentY, cardWidth, 18, 2, 2, "FD");

      // Value
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(r, g, b);
      doc.text(kpi.value, x + cardWidth / 2, this.currentY + 8, { align: "center" });

      // Label
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      doc.text(kpi.label, x + cardWidth / 2, this.currentY + 13, { align: "center" });

      // Sub
      if (kpi.sub) {
        doc.setFontSize(6);
        doc.setTextColor(130, 130, 130);
        doc.text(kpi.sub, x + cardWidth / 2, this.currentY + 17, { align: "center" });
      }

      x += cardWidth + 4;
    });

    doc.setTextColor(0, 0, 0);
    this.currentY += 22;
  }

  // ─── Table ────────────────────────────────────────────────

  addTable(columns: PdfTableColumn[], rows: Record<string, any>[], summary?: { label: string; value: string }[]) {
    const doc = this.doc;
    const [r, g, b] = this.primaryRgb;

    const head = [columns.map((c) => c.header)];
    const body = rows.map((row) => columns.map((c) => row[c.dataKey] ?? "—"));

    autoTable(doc, {
      startY: this.currentY,
      head,
      body,
      margin: { left: this.margin, right: this.margin },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        overflow: "linebreak",
        textColor: [30, 30, 30],
      },
      headStyles: {
        fillColor: [r, g, b],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 255],
      },
      columnStyles: columns.reduce((acc, col, i) => {
        acc[i] = {
          halign: col.align ?? "left",
          ...(col.width ? { cellWidth: col.width } : {}),
        };
        return acc;
      }, {} as Record<number, any>),
      didDrawPage: (data) => {
        // Update currentY after table draws
        this.currentY = (data.cursor?.y ?? this.currentY) + 4;
      },
    });

    // Summary rows
    if (summary && summary.length > 0) {
      if (this.currentY > this.pageHeight - this.footerHeight - 20) {
        this.addPage();
      }
      summary.forEach((s) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(r, g, b);
        doc.text(s.label, this.pageWidth - this.margin - 60, this.currentY);
        doc.text(s.value, this.pageWidth - this.margin, this.currentY, { align: "right" });
        doc.setTextColor(0, 0, 0);
        this.currentY += 5;
      });
      this.currentY += 3;
    }
  }

  // ─── Text Block ───────────────────────────────────────────

  addText(text: string, fontSize = 8) {
    const doc = this.doc;
    if (this.currentY > this.pageHeight - this.footerHeight - 15) {
      this.addPage();
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(text, this.pageWidth - this.margin * 2);
    doc.text(lines, this.margin, this.currentY);
    this.currentY += lines.length * (fontSize * 0.4) + 4;
    doc.setTextColor(0, 0, 0);
  }

  addSpacer(mm = 6) {
    this.currentY += mm;
  }

  // ─── Page Management ─────────────────────────────────────

  private addPage() {
    this.doc.addPage();
    this.pageCount++;
    this.currentY = this.headerHeight + 6;
  }

  // ─── Build ────────────────────────────────────────────────

  build(title: string, subtitle?: string, period?: string): Buffer {
    const doc = this.doc;
    const totalPages = doc.getNumberOfPages();

    // Draw header and footer on all pages
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      this.drawHeader(title, subtitle, period);
      this.drawFooter(i, totalPages);
    }

    return Buffer.from(doc.output("arraybuffer"));
  }
}

// ─── High-level document builder ─────────────────────────

export function buildPdfDocument(options: PdfDocumentOptions): Buffer {
  const builder = new PdfBuilder(options.lab);

  options.sections.forEach((section) => {
    if (section.spacer) {
      builder.addSpacer(section.spacer);
    }

    if (section.title) {
      builder.addSectionTitle(section.title, section.subtitle);
    }

    if (section.kpis && section.kpis.length > 0) {
      builder.addKpiRow(section.kpis);
    }

    if (section.table) {
      builder.addTable(section.table.columns, section.table.rows, section.table.summary);
    }

    if (section.text) {
      builder.addText(section.text);
    }
  });

  return builder.build(options.title, options.subtitle, options.period);
}

// ─── Format helpers ───────────────────────────────────────

export function fmtBRL(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtDate(ts: Date | number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("pt-BR");
}

export function fmtDateTime(ts: Date | number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("pt-BR");
}

export function fmtStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "Aguardando",
    in_production: "Em Produção",
    review: "Revisão",
    ready: "Pronto",
    delivered: "Entregue",
    overdue: "Atrasado",
    open: "Em Aberto",
    paid: "Pago",
    cancelled: "Cancelado",
    closed: "Fechado",
    in: "Entrada",
    out: "Saída",
    adjustment: "Ajuste",
  };
  return map[status] ?? status;
}
