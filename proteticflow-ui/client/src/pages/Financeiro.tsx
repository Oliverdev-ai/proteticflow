/**
 * Financeiro — ProteticFlow "Atelier Digital"
 * Módulo financeiro completo com 4 tabs:
 * 1. Contas a Receber (auto-geradas quando trabalho é entregue)
 * 2. Fechamento Mensal (soma débitos por cliente em um período)
 * 3. Contas a Pagar (despesas do laboratório)
 * 4. Extrato por Cliente (relatório de período)
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, FileText, TrendingUp, TrendingDown,
  Loader2, Plus, Check, X, Calendar, Search,
  Receipt, ClipboardList, CreditCard, BarChart3,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const fadeUp = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

const receivableStatusMap: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-warning-light text-warning" },
  paid: { label: "Pago", className: "bg-success-light text-success" },
  overdue: { label: "Vencido", className: "bg-danger-light text-danger" },
  cancelled: { label: "Cancelado", className: "bg-muted text-muted-foreground" },
};

const closingStatusMap: Record<string, { label: string; className: string }> = {
  open: { label: "Aberto", className: "bg-primary/10 text-primary" },
  closed: { label: "Fechado", className: "bg-warning-light text-warning" },
  paid: { label: "Pago", className: "bg-success-light text-success" },
};

// ─── Tab 1: Contas a Receber ────────────────────────────────

function ContasReceber() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const { data: receivables, isLoading } = trpc.financial.receivables.list.useQuery(
    statusFilter ? { status: statusFilter } : undefined
  );
  const utils = trpc.useUtils();

  const markPaidMutation = trpc.financial.receivables.markPaid.useMutation({
    onSuccess: () => {
      utils.financial.receivables.list.invalidate();
      toast.success("Conta marcada como paga!");
    },
  });

  const items = receivables ?? [];

  const totals = useMemo(() => {
    const pending = items.filter(i => i.status === "pending").reduce((s, i) => s + parseFloat(String(i.amount)), 0);
    const paid = items.filter(i => i.status === "paid").reduce((s, i) => s + parseFloat(String(i.amount)), 0);
    const overdue = items.filter(i => i.status === "overdue").reduce((s, i) => s + parseFloat(String(i.amount)), 0);
    return { pending, paid, overdue };
  }, [items]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-warning-light"><DollarSign size={18} className="text-warning" /></div>
            <div>
              <p className="text-xs text-muted-foreground font-body">A Receber</p>
              <p className="text-lg font-heading font-bold text-foreground">R$ {totals.pending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-success-light"><TrendingUp size={18} className="text-success" /></div>
            <div>
              <p className="text-xs text-muted-foreground font-body">Recebido</p>
              <p className="text-lg font-heading font-bold text-success">R$ {totals.paid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-danger-light"><TrendingDown size={18} className="text-danger" /></div>
            <div>
              <p className="text-xs text-muted-foreground font-body">Vencido</p>
              <p className="text-lg font-heading font-bold text-danger">R$ {totals.overdue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {[
          { value: undefined, label: "Todos" },
          { value: "pending", label: "Pendentes" },
          { value: "paid", label: "Pagos" },
          { value: "overdue", label: "Vencidos" },
        ].map((f) => (
          <Button key={f.label} variant={statusFilter === f.value ? "default" : "outline"} size="sm"
            className={`text-xs ${statusFilter === f.value ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setStatusFilter(f.value)}>{f.label}</Button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center border border-border/60">
          <Receipt size={40} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-body">Nenhuma conta a receber encontrada.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">As contas são geradas automaticamente quando um trabalho é entregue.</p>
        </Card>
      ) : (
        <Card className="border border-border/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Descrição</th>
                  <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                  <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Valor</th>
                  <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Vencimento</th>
                  <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const st = receivableStatusMap[item.status] || receivableStatusMap.pending;
                  return (
                    <tr key={item.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="p-4">
                        <p className="text-sm font-semibold text-foreground">{item.description || `Trabalho #${item.jobId}`}</p>
                        {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                      </td>
                      <td className="p-4 text-sm text-foreground">{item.clientName || "—"}</td>
                      <td className="p-4 text-sm font-heading font-bold text-foreground">
                        R$ {parseFloat(String(item.amount)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{new Date(item.dueDate).toLocaleDateString("pt-BR")}</span>
                        </div>
                      </td>
                      <td className="p-4"><Badge className={`${st.className} border-0 text-xs`}>{st.label}</Badge></td>
                      <td className="p-4 text-right">
                        {item.status === "pending" && (
                          <Button size="sm" variant="outline" className="text-xs text-success border-success/30 hover:bg-success-light"
                            onClick={() => markPaidMutation.mutate({ id: item.id })}
                            disabled={markPaidMutation.isPending}>
                            <Check size={14} className="mr-1" /> Recebido
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Tab 2: Fechamento Mensal ───────────────────────────────

function FechamentoMensal() {
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<number | "">("");
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const { data: closings, isLoading } = trpc.financial.closings.list.useQuery();
  const { data: clientsList } = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();

  const generateMutation = trpc.financial.closings.generate.useMutation({
    onSuccess: (data) => {
      utils.financial.closings.list.invalidate();
      toast.success("Fechamento gerado!", {
        description: `Total: R$ ${parseFloat(String(data.totalAmount)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      });
      setGenerateOpen(false);
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  const closeMutation = trpc.financial.closings.close.useMutation({
    onSuccess: () => { utils.financial.closings.list.invalidate(); toast.success("Fechamento encerrado!"); },
  });

  const markPaidMutation = trpc.financial.closings.markPaid.useMutation({
    onSuccess: () => { utils.financial.closings.list.invalidate(); toast.success("Fechamento marcado como pago!"); },
  });

  const items = closings ?? [];
  const clients = clientsList ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-body">
            Gere o fechamento mensal para cada cliente. O sistema soma automaticamente todos os trabalhos entregues no período.
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading font-semibold" onClick={() => setGenerateOpen(true)}>
          <FileText size={16} className="mr-2" /> Gerar Fechamento
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center border border-border/60">
          <ClipboardList size={40} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-body">Nenhum fechamento gerado ainda.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Gerar Fechamento" para criar o primeiro.</p>
        </Card>
      ) : (
        <Card className="border border-border/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                  <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Período</th>
                  <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Trabalhos</th>
                  <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                  <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const st = closingStatusMap[item.status] || closingStatusMap.open;
                  return (
                    <tr key={item.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="p-4">
                        <p className="text-sm font-semibold text-foreground">{item.clientName || "—"}</p>
                      </td>
                      <td className="p-4 text-sm text-foreground font-heading">{item.period}</td>
                      <td className="p-4 text-sm text-foreground">{item.totalJobs}</td>
                      <td className="p-4 text-sm font-heading font-bold text-foreground">
                        R$ {parseFloat(String(item.totalAmount)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4"><Badge className={`${st.className} border-0 text-xs`}>{st.label}</Badge></td>
                      <td className="p-4 text-right space-x-2">
                        {item.status === "open" && (
                          <Button size="sm" variant="outline" className="text-xs"
                            onClick={() => closeMutation.mutate({ id: item.id })}
                            disabled={closeMutation.isPending}>
                            <X size={14} className="mr-1" /> Fechar
                          </Button>
                        )}
                        {(item.status === "open" || item.status === "closed") && (
                          <Button size="sm" variant="outline" className="text-xs text-success border-success/30 hover:bg-success-light"
                            onClick={() => markPaidMutation.mutate({ id: item.id })}
                            disabled={markPaidMutation.isPending}>
                            <Check size={14} className="mr-1" /> Pago
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Gerar Fechamento */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Gerar Fechamento Mensal</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="font-body text-sm">Cliente *</Label>
              <Select value={selectedClient ? String(selectedClient) : ""} onValueChange={(v) => setSelectedClient(Number(v))}>
                <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name} {c.clinic ? `— ${c.clinic}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="font-body text-sm">Período (YYYY-MM) *</Label>
              <Input type="month" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground font-body">
              O sistema irá somar automaticamente todos os trabalhos entregues para este cliente no período selecionado.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>Cancelar</Button>
            <Button className="bg-primary text-primary-foreground"
              disabled={!selectedClient || !selectedPeriod || generateMutation.isPending}
              onClick={() => {
                if (!selectedClient || !selectedPeriod) return;
                generateMutation.mutate({ clientId: Number(selectedClient), period: selectedPeriod });
              }}>
              {generateMutation.isPending && <Loader2 size={16} className="mr-2 animate-spin" />}
              Gerar Fechamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 3: Contas a Pagar ──────────────────────────────────

function ContasPagar() {
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ description: "", supplier: "", category: "", amount: "", dueDate: "", notes: "" });

  const { data: payables, isLoading } = trpc.financial.payables.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.financial.payables.create.useMutation({
    onSuccess: () => {
      utils.financial.payables.list.invalidate();
      toast.success("Despesa cadastrada!");
      setCreateOpen(false);
      setForm({ description: "", supplier: "", category: "", amount: "", dueDate: "", notes: "" });
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  const markPaidMutation = trpc.financial.payables.markPaid.useMutation({
    onSuccess: () => { utils.financial.payables.list.invalidate(); toast.success("Despesa marcada como paga!"); },
  });

  const items = payables ?? [];

  const totals = useMemo(() => {
    const pending = items.filter(i => i.status === "pending").reduce((s, i) => s + parseFloat(String(i.amount)), 0);
    const paid = items.filter(i => i.status === "paid").reduce((s, i) => s + parseFloat(String(i.amount)), 0);
    return { pending, paid };
  }, [items]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4 border border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-danger-light"><TrendingDown size={18} className="text-danger" /></div>
            <div>
              <p className="text-xs text-muted-foreground font-body">A Pagar</p>
              <p className="text-lg font-heading font-bold text-danger">R$ {totals.pending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-success-light"><Check size={18} className="text-success" /></div>
            <div>
              <p className="text-xs text-muted-foreground font-body">Pago</p>
              <p className="text-lg font-heading font-bold text-success">R$ {totals.paid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading font-semibold" onClick={() => setCreateOpen(true)}>
          <Plus size={16} className="mr-2" /> Nova Despesa
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center border border-border/60">
          <CreditCard size={40} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-body">Nenhuma despesa cadastrada.</p>
        </Card>
      ) : (
        <Card className="border border-border/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Descrição</th>
                  <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Fornecedor</th>
                  <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Categoria</th>
                  <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Valor</th>
                  <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Vencimento</th>
                  <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const st = receivableStatusMap[item.status] || receivableStatusMap.pending;
                  return (
                    <tr key={item.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="p-4 text-sm font-semibold text-foreground">{item.description}</td>
                      <td className="p-4 text-sm text-foreground">{item.supplier || "—"}</td>
                      <td className="p-4 text-sm text-muted-foreground">{item.category || "—"}</td>
                      <td className="p-4 text-sm font-heading font-bold text-foreground">
                        R$ {parseFloat(String(item.amount)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{new Date(item.dueDate).toLocaleDateString("pt-BR")}</span>
                        </div>
                      </td>
                      <td className="p-4"><Badge className={`${st.className} border-0 text-xs`}>{st.label}</Badge></td>
                      <td className="p-4 text-right">
                        {item.status === "pending" && (
                          <Button size="sm" variant="outline" className="text-xs text-success border-success/30 hover:bg-success-light"
                            onClick={() => markPaidMutation.mutate({ id: item.id })}
                            disabled={markPaidMutation.isPending}>
                            <Check size={14} className="mr-1" /> Pago
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Nova Despesa */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Nova Despesa</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="font-body text-sm">Descrição *</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Material de consumo, aluguel..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="font-body text-sm">Fornecedor</Label>
                <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Nome do fornecedor" />
              </div>
              <div className="grid gap-2">
                <Label className="font-body text-sm">Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="aluguel">Aluguel</SelectItem>
                    <SelectItem value="equipamento">Equipamento</SelectItem>
                    <SelectItem value="salario">Salário</SelectItem>
                    <SelectItem value="imposto">Imposto</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="font-body text-sm">Valor (R$) *</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="500.00" />
              </div>
              <div className="grid gap-2">
                <Label className="font-body text-sm">Vencimento *</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="font-body text-sm">Observações</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button className="bg-primary text-primary-foreground"
              disabled={!form.description || !form.amount || !form.dueDate || createMutation.isPending}
              onClick={() => {
                createMutation.mutate({
                  description: form.description,
                  supplier: form.supplier || undefined,
                  category: form.category || undefined,
                  amount: form.amount,
                  dueDate: new Date(form.dueDate),
                  notes: form.notes || undefined,
                });
              }}>
              {createMutation.isPending && <Loader2 size={16} className="mr-2 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 4: Extrato por Cliente ─────────────────────────────

function ExtratoCliente() {
  const [selectedClient, setSelectedClient] = useState<number | "">("");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [shouldFetch, setShouldFetch] = useState(false);

  const { data: clientsList } = trpc.clients.list.useQuery();
  const { data: statement, isLoading } = trpc.financial.statement.useQuery(
    { clientId: Number(selectedClient), startDate: new Date(startDate), endDate: new Date(endDate) },
    { enabled: shouldFetch && !!selectedClient && !!startDate && !!endDate }
  );

  const clients = clientsList ?? [];

  function handleSearch() {
    if (!selectedClient) { toast.error("Selecione um cliente"); return; }
    setShouldFetch(true);
  }

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card className="p-5 border border-border/60">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div className="grid gap-2">
            <Label className="font-body text-sm">Cliente *</Label>
            <Select value={selectedClient ? String(selectedClient) : ""} onValueChange={(v) => { setSelectedClient(Number(v)); setShouldFetch(false); }}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="font-body text-sm">Data Início</Label>
            <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setShouldFetch(false); }} />
          </div>
          <div className="grid gap-2">
            <Label className="font-body text-sm">Data Fim</Label>
            <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setShouldFetch(false); }} />
          </div>
          <Button className="bg-primary text-primary-foreground font-heading font-semibold" onClick={handleSearch}>
            <Search size={16} className="mr-2" /> Consultar
          </Button>
        </div>
      </Card>

      {/* Results */}
      {isLoading && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>}

      {shouldFetch && statement && (
        <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-4">
          {/* Summary */}
          <Card className="p-5 border border-border/60">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground font-body">Total de Trabalhos</p>
                <p className="text-xl font-heading font-bold text-foreground">{statement.items.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-body">Valor Total</p>
                <p className="text-xl font-heading font-bold text-primary">
                  R$ {statement.totals.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-body">Pago</p>
                <p className="text-xl font-heading font-bold text-success">
                  R$ {statement.totals.paid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-body">Pendente</p>
                <p className="text-xl font-heading font-bold text-warning">
                  R$ {statement.totals.pending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>

          {/* Jobs List */}
          {statement.items && statement.items.length > 0 ? (
            <Card className="border border-border/60 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30">
                      <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Código</th>
                      <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">OS</th>
                      <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Serviço</th>
                      <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Paciente</th>
                      <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Valor</th>
                      <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Entrega</th>
                      <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Status Pgto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.items.map((item) => (
                      <tr key={item.jobId} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="p-4 text-sm font-heading font-bold text-primary">{item.jobCode}</td>
                        <td className="p-4 text-sm text-foreground">{item.orderNumber || "—"}</td>
                        <td className="p-4 text-sm text-foreground">{item.serviceName}</td>
                        <td className="p-4 text-sm text-muted-foreground">{item.patientName || "—"}</td>
                        <td className="p-4 text-sm font-heading font-bold">
                          R$ {parseFloat(String(item.price)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-xs text-muted-foreground">
                          {item.deliveredAt ? new Date(item.deliveredAt).toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="p-4">
                          <Badge className={`${(receivableStatusMap[item.arStatus || "pending"] || receivableStatusMap.pending).className} border-0 text-xs`}>
                            {(receivableStatusMap[item.arStatus || "pending"] || receivableStatusMap.pending).label}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center border border-border/60">
              <BarChart3 size={40} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-body">Nenhum trabalho encontrado neste período.</p>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function Financeiro() {
  return (
    <motion.div variants={{ animate: { transition: { staggerChildren: 0.06 } } }} initial="initial" animate="animate" className="space-y-6">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-heading font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground font-body mt-1">Gerencie contas a receber, fechamentos mensais e despesas do laboratório</p>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Tabs defaultValue="receivables" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50 rounded-xl p-1 h-auto">
            <TabsTrigger value="receivables" className="text-xs sm:text-sm font-heading data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2.5 flex items-center gap-1.5">
              <Receipt size={15} className="hidden sm:block" /> Receber
            </TabsTrigger>
            <TabsTrigger value="closings" className="text-xs sm:text-sm font-heading data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2.5 flex items-center gap-1.5">
              <ClipboardList size={15} className="hidden sm:block" /> Fechamento
            </TabsTrigger>
            <TabsTrigger value="payables" className="text-xs sm:text-sm font-heading data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2.5 flex items-center gap-1.5">
              <CreditCard size={15} className="hidden sm:block" /> Pagar
            </TabsTrigger>
            <TabsTrigger value="statement" className="text-xs sm:text-sm font-heading data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2.5 flex items-center gap-1.5">
              <BarChart3 size={15} className="hidden sm:block" /> Extrato
            </TabsTrigger>
          </TabsList>

          <TabsContent value="receivables" className="mt-6"><ContasReceber /></TabsContent>
          <TabsContent value="closings" className="mt-6"><FechamentoMensal /></TabsContent>
          <TabsContent value="payables" className="mt-6"><ContasPagar /></TabsContent>
          <TabsContent value="statement" className="mt-6"><ExtratoCliente /></TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
