/**
 * Trabalhos — ProteticFlow "Atelier Digital"
 * Tabela de trabalhos com busca, filtros por status, CRUD real via tRPC,
 * campos de número de OS e nome do paciente, e modal de detalhes
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search, Plus, MoreHorizontal, Loader2, Calendar, Hash, User,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const fadeUp = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

const statusMap: Record<string, { label: string; className: string }> = {
  waiting: { label: "Aguardando", className: "bg-muted text-muted-foreground" },
  in_production: { label: "Em Produção", className: "bg-warning-light text-warning" },
  review: { label: "Revisão", className: "bg-primary/10 text-primary" },
  ready: { label: "Pronto", className: "bg-success-light text-success" },
  delivered: { label: "Entregue", className: "bg-sage-light text-sage" },
  overdue: { label: "Atrasado", className: "bg-danger-light text-danger" },
};

const statusOptions = [
  { value: "all", label: "Todos" },
  { value: "waiting", label: "Aguardando" },
  { value: "in_production", label: "Em Produção" },
  { value: "review", label: "Revisão" },
  { value: "ready", label: "Pronto" },
  { value: "delivered", label: "Entregue" },
  { value: "overdue", label: "Atrasado" },
];

type JobForm = {
  clientId: number | "";
  orderNumber: string;
  patientName: string;
  serviceName: string;
  tooth: string;
  price: string;
  deadline: string;
  notes: string;
  status: string;
  progress: number;
};

const emptyForm: JobForm = {
  clientId: "", orderNumber: "", patientName: "", serviceName: "", tooth: "", price: "", deadline: "", notes: "", status: "waiting", progress: 0,
};

export default function Trabalhos() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<JobForm>(emptyForm);
  const [autoResolvedClient, setAutoResolvedClient] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: jobsList, isLoading } = trpc.jobs.list.useQuery({ search: search || undefined, status: statusFilter });
  const { data: clientsList } = trpc.clients.list.useQuery();

  const createMutation = trpc.jobs.create.useMutation({
    onSuccess: () => {
      utils.jobs.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("Trabalho criado!");
      closeModal();
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });
  const updateMutation = trpc.jobs.update.useMutation({
    onSuccess: () => {
      utils.jobs.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.financial?.receivables?.list?.invalidate?.();
      toast.success("Trabalho atualizado!");
      closeModal();
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });
  const deleteMutation = trpc.jobs.delete.useMutation({
    onSuccess: () => { utils.jobs.list.invalidate(); utils.dashboard.stats.invalidate(); toast.success("Trabalho removido."); },
  });

  const jobs = jobsList ?? [];
  const clients = clientsList ?? [];

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setAutoResolvedClient(null);
    setModalOpen(true);
  }

  function openEdit(j: typeof jobs[0]) {
    setEditingId(j.id);
    setForm({
      clientId: j.clientId,
      orderNumber: j.orderNumber ? String(j.orderNumber) : "",
      patientName: j.patientName ?? "",
      serviceName: j.serviceName,
      tooth: j.tooth ?? "",
      price: String(j.price),
      deadline: j.deadline ? new Date(j.deadline).toISOString().split("T")[0] : "",
      notes: j.notes ?? "",
      status: j.status,
      progress: j.progress,
    });
    setAutoResolvedClient(null);
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditingId(null); setForm(emptyForm); setAutoResolvedClient(null); }

  // Auto-resolve client when order number is entered
  function handleOrderNumberChange(value: string) {
    setForm({ ...form, orderNumber: value });
    setAutoResolvedClient(null);

    if (value && !isNaN(Number(value)) && Number(value) > 0) {
      // Search through client blocks to find the owner
      // This is a simple client-side check; the backend also resolves
      const orderNum = Number(value);
      // We don't have blocks loaded here, so we'll rely on backend resolution
      // Just show a hint that it will be auto-resolved
      if (!form.clientId) {
        setAutoResolvedClient("O cliente será identificado automaticamente pelo número da OS");
      }
    }
  }

  function handleSubmit() {
    if (!form.serviceName.trim()) { toast.error("Nome do serviço é obrigatório"); return; }
    if (!form.clientId && !form.orderNumber) { toast.error("Selecione um cliente ou informe o número da OS"); return; }
    if (!form.deadline) { toast.error("Data de entrega é obrigatória"); return; }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        serviceName: form.serviceName,
        orderNumber: form.orderNumber ? Number(form.orderNumber) : undefined,
        patientName: form.patientName || undefined,
        tooth: form.tooth || undefined,
        price: form.price,
        deadline: new Date(form.deadline),
        notes: form.notes || undefined,
        status: form.status as any,
        progress: form.progress,
      });
    } else {
      createMutation.mutate({
        clientId: form.clientId ? Number(form.clientId) : undefined,
        orderNumber: form.orderNumber ? Number(form.orderNumber) : undefined,
        patientName: form.patientName || undefined,
        serviceName: form.serviceName,
        tooth: form.tooth || undefined,
        price: form.price,
        deadline: new Date(form.deadline),
        notes: form.notes || undefined,
      });
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function daysUntil(deadline: Date | string) {
    const d = new Date(deadline);
    return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  return (
    <motion.div variants={{ animate: { transition: { staggerChildren: 0.06 } } }} initial="initial" animate="animate" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Trabalhos</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">Gerencie ordens de serviço do laboratório</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading font-semibold" onClick={openNew}>
          <Plus size={18} className="mr-2" /> Novo Trabalho
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp}>
        <Card className="border border-border/60 shadow-sm">
          <div className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Buscar por código, OS, cliente ou serviço..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl bg-muted/50 border-0 text-sm font-body placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {statusOptions.map((s) => (
                <Button key={s.value} variant={statusFilter === s.value ? "default" : "outline"} size="sm"
                  className={`text-xs font-body ${statusFilter === s.value ? "bg-primary text-primary-foreground" : ""}`}
                  onClick={() => setStatusFilter(s.value)}>{s.label}</Button>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Loading */}
      {isLoading && <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>}

      {/* Empty State */}
      {!isLoading && jobs.length === 0 && (
        <motion.div variants={fadeUp} className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-lg font-heading font-semibold mb-2">Nenhum trabalho encontrado</p>
          <p className="text-sm font-body mb-4">Crie seu primeiro trabalho para começar.</p>
          <Button onClick={openNew} className="bg-primary text-primary-foreground"><Plus size={16} className="mr-2" /> Novo Trabalho</Button>
        </motion.div>
      )}

      {/* Jobs Table */}
      {!isLoading && jobs.length > 0 && (
        <motion.div variants={fadeUp}>
          <Card className="border border-border/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Código</th>
                    <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">OS</th>
                    <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Serviço</th>
                    <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                    <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Paciente</th>
                    <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Progresso</th>
                    <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Prazo</th>
                    {isAdmin && <th className="text-left p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Valor</th>}
                    <th className="text-right p-4 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const status = statusMap[job.status] || statusMap.waiting;
                    const days = job.deadline ? daysUntil(job.deadline) : 999;
                    return (
                      <tr key={job.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => openEdit(job)}>
                        <td className="p-4 text-sm font-heading font-bold text-primary">{job.code}</td>
                        <td className="p-4">
                          {job.orderNumber ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="flex items-center gap-1">
                                  <Hash size={13} className="text-primary/60" />
                                  <span className="text-sm font-heading font-semibold text-foreground">{job.orderNumber}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>Ordem de Serviço n.{job.orderNumber}</TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-semibold text-foreground">{job.serviceName}</p>
                          {job.tooth && <p className="text-xs text-muted-foreground">Dente: {job.tooth}</p>}
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-foreground">{job.clientName || "—"}</p>
                          {job.clientClinic && <p className="text-xs text-muted-foreground">{job.clientClinic}</p>}
                        </td>
                        <td className="p-4 hidden lg:table-cell">
                          {job.patientName ? (
                            <div className="flex items-center gap-1.5">
                              <User size={13} className="text-muted-foreground" />
                              <span className="text-sm text-foreground">{job.patientName}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-4"><Badge className={`${status.className} border-0 text-xs font-medium`}>{status.label}</Badge></td>
                        <td className="p-4 min-w-[120px] hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <Progress value={job.progress} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground font-body">{job.progress}%</span>
                          </div>
                        </td>
                        <td className="p-4 hidden sm:table-cell">
                          {job.deadline ? (
                            <>
                              <div className="flex items-center gap-1.5">
                                <Calendar size={13} className={days <= 0 ? "text-danger" : days <= 2 ? "text-warning" : "text-muted-foreground"} />
                                <span className={`text-xs font-body ${days <= 0 ? "text-danger font-semibold" : days <= 2 ? "text-warning" : "text-muted-foreground"}`}>
                                  {new Date(job.deadline).toLocaleDateString("pt-BR")}
                                </span>
                              </div>
                              {days <= 0 && job.status !== "delivered" && <p className="text-xs text-danger font-semibold mt-0.5">Vencido!</p>}
                              {days > 0 && days <= 2 && job.status !== "delivered" && <p className="text-xs text-warning mt-0.5">{days}d restante{days > 1 ? "s" : ""}</p>}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="p-4 text-sm font-heading font-bold text-foreground hidden xl:table-cell">
                            R$ {parseFloat(String(job.price)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                        )}
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}><MoreHorizontal size={16} /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="font-body">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(job); }}>Editar</DropdownMenuItem>
                              {isAdmin && (
                                <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: job.id }); }}>Excluir</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Pagination info */}
      {!isLoading && jobs.length > 0 && (
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground font-body">
            Mostrando <span className="font-semibold text-foreground">{jobs.length}</span> trabalhos
          </p>
        </motion.div>
      )}

      {/* Modal Create/Edit */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">{editingId ? "Editar Trabalho" : "Novo Trabalho"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* OS Number + Patient Name - Highlighted section */}
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
              <p className="text-xs font-heading font-semibold text-primary flex items-center gap-1.5">
                <Hash size={13} /> Ordem de Serviço
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="font-body text-xs">N. da OS</Label>
                  <Input
                    type="number"
                    value={form.orderNumber}
                    onChange={(e) => handleOrderNumberChange(e.target.value)}
                    placeholder="1250"
                    className="h-9"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="font-body text-xs">Paciente</Label>
                  <Input
                    value={form.patientName}
                    onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                    placeholder="Nome do paciente"
                    className="h-9"
                  />
                </div>
              </div>
              {autoResolvedClient && !form.clientId && (
                <p className="text-xs text-primary/80 font-body flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  {autoResolvedClient}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label className="font-body text-sm">Cliente {form.orderNumber ? "(opcional se OS preenchida)" : "*"}</Label>
              <Select value={form.clientId ? String(form.clientId) : ""} onValueChange={(v) => setForm({ ...form, clientId: Number(v) })}>
                <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name} {c.clinic ? `— ${c.clinic}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="font-body text-sm">Serviço *</Label>
              <Input value={form.serviceName} onChange={(e) => setForm({ ...form, serviceName: e.target.value })} placeholder="Coroa Metalocerâmica, PPR, SNS 03..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="font-body text-sm">Dente</Label>
                <Input value={form.tooth} onChange={(e) => setForm({ ...form, tooth: e.target.value })} placeholder="#14" />
              </div>
              <div className="grid gap-2">
                <Label className="font-body text-sm">Valor (R$) *</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="350.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="font-body text-sm">Prazo de Entrega *</Label>
                <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
              {editingId && (
                <div className="grid gap-2">
                  <Label className="font-body text-sm">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusOptions.filter(s => s.value !== "all").map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {editingId && (
              <div className="grid gap-2">
                <Label className="font-body text-sm">Progresso: {form.progress}%</Label>
                <input type="range" min={0} max={100} step={5} value={form.progress}
                  onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} className="w-full accent-primary" />
              </div>
            )}
            <div className="grid gap-2">
              <Label className="font-body text-sm">Observações</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas sobre o trabalho..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving} className="bg-primary text-primary-foreground">
              {isSaving && <Loader2 size={16} className="mr-2 animate-spin" />}
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
