/**
 * RelatoriosPDF.tsx — ProteticFlow
 * Página de geração e download de relatórios PDF (admin-only).
 * 5 tipos: Fechamento Mensal, Trabalhos por Período, Produtividade, Trimestral/Anual, Estoque.
 * Fechamento Mensal suporta envio por e-mail ao cliente.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  FileText, Download, Calendar, Users, BarChart3,
  TrendingUp, Package, Settings, Loader2, CheckCircle2,
  Building2, Mail, AlertTriangle, Send,
} from "lucide-react";
import { Link } from "wouter";

// ─── Types ────────────────────────────────────────────────

type ReportType = "monthly_closing" | "jobs_period" | "productivity" | "quarterly_annual" | "stock";

interface ReportConfig {
  id: ReportType;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  hasMonth: boolean;
  hasQuarter: boolean;
  hasClient: boolean;
  canEmail: boolean;
}

const REPORT_CONFIGS: ReportConfig[] = [
  {
    id: "monthly_closing",
    title: "Fechamento Mensal por Cliente",
    description: "Lista todos os trabalhos entregues no mês, agrupados por cliente, com totais e contas a receber.",
    icon: <Calendar className="h-5 w-5" />,
    color: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
    hasMonth: true,
    hasQuarter: false,
    hasClient: true,
    canEmail: true,
  },
  {
    id: "jobs_period",
    title: "Trabalhos por Período",
    description: "Relatório detalhado de todos os trabalhos com filtros por status, cliente e tipo de serviço.",
    icon: <FileText className="h-5 w-5" />,
    color: "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800",
    hasMonth: true,
    hasQuarter: true,
    hasClient: true,
    canEmail: false,
  },
  {
    id: "productivity",
    title: "Produtividade por Técnico",
    description: "Desempenho de cada técnico: trabalhos entregues, taxa de entrega, atrasados e receita gerada.",
    icon: <Users className="h-5 w-5" />,
    color: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
    hasMonth: true,
    hasQuarter: true,
    hasClient: false,
    canEmail: false,
  },
  {
    id: "quarterly_annual",
    title: "Relatório Trimestral / Anual",
    description: "Visão consolidada com KPIs, top 10 clientes, evolução mensal e comparativo de receita.",
    icon: <TrendingUp className="h-5 w-5" />,
    color: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800",
    hasMonth: false,
    hasQuarter: true,
    hasClient: false,
    canEmail: false,
  },
  {
    id: "stock",
    title: "Relatório de Estoque",
    description: "Saldo atual de materiais, alertas de reposição, valor em estoque e histórico de movimentações.",
    icon: <Package className="h-5 w-5" />,
    color: "bg-teal-50 border-teal-200 dark:bg-teal-950/30 dark:border-teal-800",
    hasMonth: true,
    hasQuarter: false,
    hasClient: false,
    canEmail: false,
  },
];

const MONTHS = [
  { value: "1", label: "Janeiro" }, { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" }, { value: "4", label: "Abril" },
  { value: "5", label: "Maio" }, { value: "6", label: "Junho" },
  { value: "7", label: "Julho" }, { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" }, { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
];

const QUARTERS = [
  { value: "1", label: "1º Trimestre (Jan–Mar)" },
  { value: "2", label: "2º Trimestre (Abr–Jun)" },
  { value: "3", label: "3º Trimestre (Jul–Set)" },
  { value: "4", label: "4º Trimestre (Out–Dez)" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

// ─── Download Helper ──────────────────────────────────────

function downloadPdf(base64: string, filename: string) {
  const byteChars = atob(base64);
  const byteNums = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNums);
  const blob = new Blob([byteArray], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Email Modal (Fechamento Mensal) ─────────────────────

interface EmailModalProps {
  open: boolean;
  onClose: () => void;
  year: number;
  month: number;
  clientId?: number;
  clientEmail?: string;
  emailConfigured: boolean;
}

function EmailModal({ open, onClose, year, month, clientId, clientEmail, emailConfigured }: EmailModalProps) {
  const [toEmail, setToEmail] = useState(clientEmail ?? "");
  const [customMessage, setCustomMessage] = useState("");
  const [emailError, setEmailError] = useState("");

  const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  const sendEmail = trpc.pdfReports.sendMonthlyClosingEmail.useMutation({
    onSuccess: (data) => {
      toast.success("E-mail enviado com sucesso!", {
        description: `${data.jobCount} trabalho${data.jobCount !== 1 ? "s" : ""} — ${
          new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.totalAmount)
        }`,
      });
      onClose();
    },
    onError: (e) => {
      if (e.data?.code === "PRECONDITION_FAILED") {
        toast.error("SMTP não configurado", {
          description: "Defina SMTP_HOST, SMTP_USER e SMTP_PASS nas variáveis de ambiente do projeto.",
        });
      } else {
        toast.error("Erro ao enviar e-mail", { description: e.message });
      }
    },
  });

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSend = () => {
    if (!validateEmail(toEmail)) {
      setEmailError("Informe um e-mail válido.");
      return;
    }
    setEmailError("");
    sendEmail.mutate({
      year,
      month,
      clientId,
      toEmail,
      customMessage: customMessage.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Enviar Fechamento por E-mail
          </DialogTitle>
          <DialogDescription>
            O relatório de fechamento de <strong>{monthNames[month - 1]}/{year}</strong> será
            gerado e enviado como PDF em anexo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!emailConfigured && (
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200 text-xs">
                <strong>SMTP não configurado.</strong> Defina{" "}
                <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">SMTP_HOST</code>,{" "}
                <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">SMTP_USER</code> e{" "}
                <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">SMTP_PASS</code>{" "}
                nas variáveis de ambiente para habilitar o envio.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="toEmail" className="text-sm font-medium">
              E-mail do destinatário <span className="text-destructive">*</span>
            </Label>
            <Input
              id="toEmail"
              type="email"
              placeholder="cliente@clinica.com.br"
              value={toEmail}
              onChange={(e) => { setToEmail(e.target.value); setEmailError(""); }}
              className={emailError ? "border-destructive" : ""}
            />
            {emailError && <p className="text-xs text-destructive">{emailError}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="customMessage" className="text-sm font-medium">
              Mensagem personalizada <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="customMessage"
              placeholder="Ex: Segue o fechamento do mês. Qualquer dúvida, entre em contato."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
              maxLength={500}
              className="resize-none text-sm"
            />
            <p className="text-xs text-muted-foreground text-right">{customMessage.length}/500</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={sendEmail.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={sendEmail.isPending || !emailConfigured}
            className="gap-2"
          >
            {sendEmail.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
            ) : (
              <><Send className="h-4 w-4" />Enviar PDF</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Report Card ──────────────────────────────────────────

function ReportCard({ config, labSettings }: { config: ReportConfig; labSettings: any }) {
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [quarter, setQuarter] = useState("1");
  const [periodMode, setPeriodMode] = useState<"month" | "quarter" | "annual">(
    config.hasMonth ? "month" : config.hasQuarter ? "quarter" : "annual"
  );
  const [clientId, setClientId] = useState<string>("all");
  const [generated, setGenerated] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const { data: clients } = trpc.clients.list.useQuery(undefined, { enabled: config.hasClient });
  const { data: emailConfig } = trpc.pdfReports.checkEmailConfig.useQuery();

  // Mutations
  const genMonthlyClosing = trpc.pdfReports.generateMonthlyClosing.useMutation({
    onSuccess: (data) => { downloadPdf(data.base64, data.filename); setGenerated(true); toast.success("PDF gerado com sucesso!"); },
    onError: (e) => toast.error("Erro ao gerar PDF", { description: e.message }),
  });
  const genJobsPeriod = trpc.pdfReports.generateJobsPeriod.useMutation({
    onSuccess: (data) => { downloadPdf(data.base64, data.filename); setGenerated(true); toast.success("PDF gerado com sucesso!"); },
    onError: (e) => toast.error("Erro ao gerar PDF", { description: e.message }),
  });
  const genProductivity = trpc.pdfReports.generateProductivity.useMutation({
    onSuccess: (data) => { downloadPdf(data.base64, data.filename); setGenerated(true); toast.success("PDF gerado com sucesso!"); },
    onError: (e) => toast.error("Erro ao gerar PDF", { description: e.message }),
  });
  const genQuarterlyAnnual = trpc.pdfReports.generateQuarterlyAnnual.useMutation({
    onSuccess: (data) => { downloadPdf(data.base64, data.filename); setGenerated(true); toast.success("PDF gerado com sucesso!"); },
    onError: (e) => toast.error("Erro ao gerar PDF", { description: e.message }),
  });
  const genStock = trpc.pdfReports.generateStockReport.useMutation({
    onSuccess: (data) => { downloadPdf(data.base64, data.filename); setGenerated(true); toast.success("PDF gerado com sucesso!"); },
    onError: (e) => toast.error("Erro ao gerar PDF", { description: e.message }),
  });

  const isLoading = genMonthlyClosing.isPending || genJobsPeriod.isPending ||
    genProductivity.isPending || genQuarterlyAnnual.isPending || genStock.isPending;

  const handleGenerate = () => {
    const y = parseInt(year);
    const m = periodMode === "month" ? parseInt(month) : undefined;
    const q = periodMode === "quarter" ? parseInt(quarter) : undefined;
    const cId = clientId !== "all" ? parseInt(clientId) : undefined;
    setGenerated(false);

    switch (config.id) {
      case "monthly_closing":
        genMonthlyClosing.mutate({ year: y, month: parseInt(month), clientId: cId });
        break;
      case "jobs_period":
        genJobsPeriod.mutate({ year: y, month: m, quarter: q, clientId: cId });
        break;
      case "productivity":
        genProductivity.mutate({ year: y, month: m, quarter: q });
        break;
      case "quarterly_annual":
        genQuarterlyAnnual.mutate({ year: y, quarter: periodMode === "annual" ? undefined : q });
        break;
      case "stock":
        genStock.mutate({ year: y, month: m, includeMovements: true });
        break;
    }
  };

  // Get selected client's email for pre-filling
  const selectedClient = clients?.find((c: any) => String(c.id) === clientId);
  const clientEmail = selectedClient?.email ?? "";

  return (
    <>
      <Card className={`border ${config.color} transition-all hover:shadow-md`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background/80 border border-border/50">
                {config.icon}
              </div>
              <div>
                <CardTitle className="text-base">{config.title}</CardTitle>
                <CardDescription className="text-xs mt-0.5">{config.description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {config.canEmail && (
                <Badge
                  variant="outline"
                  className="gap-1 text-xs cursor-default border-blue-300 text-blue-700 dark:text-blue-400"
                >
                  <Mail className="h-3 w-3" />
                  E-mail
                </Badge>
              )}
              {generated && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Gerado
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <Separator />

          {/* Period Mode Selector */}
          {(config.hasMonth || config.hasQuarter) && config.id !== "monthly_closing" && (
            <div className="flex gap-2">
              {config.hasMonth && (
                <Button
                  size="sm"
                  variant={periodMode === "month" ? "default" : "outline"}
                  onClick={() => setPeriodMode("month")}
                  className="text-xs h-7"
                >
                  Mensal
                </Button>
              )}
              {config.hasQuarter && (
                <Button
                  size="sm"
                  variant={periodMode === "quarter" ? "default" : "outline"}
                  onClick={() => setPeriodMode("quarter")}
                  className="text-xs h-7"
                >
                  Trimestral
                </Button>
              )}
              {config.id === "quarterly_annual" && (
                <Button
                  size="sm"
                  variant={periodMode === "annual" ? "default" : "outline"}
                  onClick={() => setPeriodMode("annual")}
                  className="text-xs h-7"
                >
                  Anual
                </Button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Year */}
            <div className="space-y-1">
              <Label className="text-xs">Ano</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month (if applicable) */}
            {(periodMode === "month" || config.id === "monthly_closing") && (
              <div className="space-y-1">
                <Label className="text-xs">Mês</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Quarter (if applicable) */}
            {periodMode === "quarter" && (
              <div className="space-y-1">
                <Label className="text-xs">Trimestre</Label>
                <Select value={quarter} onValueChange={setQuarter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUARTERS.map(q => (
                      <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Client filter (if applicable) */}
            {config.hasClient && clients && (
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Cliente (opcional)</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clients.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className={`grid gap-2 ${config.canEmail ? "grid-cols-2" : "grid-cols-1"}`}>
            <Button
              className="w-full gap-2"
              onClick={handleGenerate}
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Gerando...</>
              ) : (
                <><Download className="h-4 w-4" />Baixar PDF</>
              )}
            </Button>

            {config.canEmail && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setEmailModalOpen(true)}
                disabled={isLoading}
              >
                <Mail className="h-4 w-4" />
                Enviar E-mail
              </Button>
            )}
          </div>

          {/* SMTP warning badge for monthly closing */}
          {config.canEmail && emailConfig && !emailConfig.configured && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              SMTP não configurado — envio por e-mail indisponível
            </p>
          )}
        </CardContent>
      </Card>

      {/* Email Modal */}
      {config.canEmail && (
        <EmailModal
          open={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          year={parseInt(year)}
          month={parseInt(month)}
          clientId={clientId !== "all" ? parseInt(clientId) : undefined}
          clientEmail={clientEmail}
          emailConfigured={emailConfig?.configured ?? false}
        />
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────

export default function RelatoriosPDF() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: labSettings } = trpc.pdfReports.getLabSettings.useQuery();

  // Redirect non-admins
  if (user && user.role !== "admin") {
    navigate("/");
    return null;
  }

  const hasLabConfig = labSettings?.cnpj || labSettings?.phone || labSettings?.email;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Relatórios PDF</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gere, baixe e envie relatórios profissionais com a identidade visual do laboratório.
            </p>
          </div>
          <Link href="/config-lab">
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Configurar Lab
            </Button>
          </Link>
        </div>

        {/* Lab config warning */}
        {!hasLabConfig && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <Building2 className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Configure os dados do laboratório</strong> para que apareçam no cabeçalho dos PDFs.{" "}
              <Link href="/config-lab" className="underline font-medium">Configurar agora →</Link>
            </div>
          </div>
        )}

        {/* Lab info badge */}
        {labSettings && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: labSettings.primaryColor ?? "#1a56db" }}
            />
            <div className="text-sm">
              <span className="font-medium">{labSettings.labName}</span>
              {labSettings.cnpj && <span className="text-muted-foreground ml-2">CNPJ: {labSettings.cnpj}</span>}
            </div>
            <Badge variant="secondary" className="ml-auto text-xs">
              <BarChart3 className="h-3 w-3 mr-1" />
              5 tipos de relatório
            </Badge>
          </div>
        )}

        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {REPORT_CONFIGS.map(config => (
            <ReportCard key={config.id} config={config} labSettings={labSettings} />
          ))}
        </div>

        {/* Instructions */}
        <Card className="bg-muted/20">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <div>
                  <div className="font-medium">Selecione o tipo</div>
                  <div className="text-muted-foreground text-xs">Escolha o relatório que deseja gerar</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <div>
                  <div className="font-medium">Configure o período</div>
                  <div className="text-muted-foreground text-xs">Defina ano, mês ou trimestre e filtros opcionais</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <div>
                  <div className="font-medium">Baixe o PDF</div>
                  <div className="text-muted-foreground text-xs">O arquivo é gerado e baixado automaticamente</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="h-3 w-3 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">Envie por e-mail</div>
                  <div className="text-muted-foreground text-xs">Fechamento mensal pode ser enviado ao cliente com PDF em anexo</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
