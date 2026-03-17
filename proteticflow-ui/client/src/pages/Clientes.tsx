/**
 * Clientes — ProteticFlow "Atelier Digital"
 * Tabela de clientes com busca, filtros, CRUD real via tRPC,
 * modal de detalhes e seção de Blocos de OS
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search, Plus, MoreHorizontal, Phone, Mail, MapPin,
  X, Loader2, Package, Hash, ChevronDown, ChevronUp, Trash2,
  Globe, Copy, Send, ShieldOff, Trash, ExternalLink, CheckCircle2, Clock, AlertTriangle,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const fadeUp = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

type ClientForm = {
  name: string;
  clinic: string;
  email: string;
  phone: string;
  city: string;
  state: string;
};

type BlockForm = {
  blockStart: string;
  blockEnd: string;
  description: string;
};

const emptyForm: ClientForm = { name: "", clinic: "", email: "", phone: "", city: "", state: "" };
const emptyBlockForm: BlockForm = { blockStart: "", blockEnd: "", description: "" };

export default function Clientes() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [activeTab, setActiveTab] = useState("dados");
  const [blockForm, setBlockForm] = useState<BlockForm>(emptyBlockForm);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [portalEmailModal, setPortalEmailModal] = useState<{ token: string; tokenId: number } | null>(null);
  const [portalEmailMsg, setPortalEmailMsg] = useState("");
  const [newTokenLabel, setNewTokenLabel] = useState("Acesso padrão");
  const [newTokenDays, setNewTokenDays] = useState<"30" | "60" | "90" | "180" | "365">("90");

  const utils = trpc.useUtils();
  const { data: clientsList, isLoading } = trpc.clients.list.useQuery({
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  // Order blocks for the currently editing client
  const { data: clientBlocks, isLoading: blocksLoading } = trpc.orderBlocks.list.useQuery(
    { clientId: editingId ?? undefined },
    { enabled: !!editingId }
  );

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => { utils.clients.list.invalidate(); toast.success("Cliente criado com sucesso!"); closeModal(); },
    onError: (e) => toast.error("Erro ao criar cliente", { description: e.message }),
  });
  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => { utils.clients.list.invalidate(); toast.success("Cliente atualizado!"); closeModal(); },
    onError: (e) => toast.error("Erro ao atualizar", { description: e.message }),
  });
  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => { utils.clients.list.invalidate(); toast.success("Cliente removido."); },
    onError: (e) => toast.error("Erro ao remover", { description: e.message }),
  });

  // Block mutations
  const createBlockMutation = trpc.orderBlocks.create.useMutation({
    onSuccess: () => {
      utils.orderBlocks.list.invalidate();
      toast.success("Bloco de OS cadastrado!");
      setBlockForm(emptyBlockForm);
      setShowBlockForm(false);
    },
    onError: (e) => toast.error("Erro ao criar bloco", { description: e.message }),
  });
  const deleteBlockMutation = trpc.orderBlocks.delete.useMutation({
    onSuccess: () => { utils.orderBlocks.list.invalidate(); toast.success("Bloco removido."); },
    onError: (e) => toast.error("Erro ao remover bloco", { description: e.message }),
  });

  const clients = clientsList ?? [];
  const blocks = clientBlocks ?? [];

  // Portal tokens
  const { data: portalTokens, isLoading: tokensLoading } = trpc.portal.listTokens.useQuery(
    { clientId: editingId ?? 0 },
    { enabled: !!editingId }
  );
  const generateTokenMutation = trpc.portal.generateToken.useMutation({
    onSuccess: () => { utils.portal.listTokens.invalidate(); toast.success("Link de acesso gerado!"); setNewTokenLabel("Acesso padrão"); },
    onError: (e) => toast.error("Erro ao gerar token", { description: e.message }),
  });
  const revokeTokenMutation = trpc.portal.revokeToken.useMutation({
    onSuccess: () => { utils.portal.listTokens.invalidate(); toast.success("Token revogado."); },
    onError: (e) => toast.error("Erro ao revogar", { description: e.message }),
  });
  const deleteTokenMutation = trpc.portal.deleteToken.useMutation({
    onSuccess: () => { utils.portal.listTokens.invalidate(); toast.success("Token removido."); },
    onError: (e) => toast.error("Erro ao remover", { description: e.message }),
  });
  const sendPortalLinkMutation = trpc.portal.sendPortalLink.useMutation({
    onSuccess: () => { toast.success("Link enviado por e-mail!"); setPortalEmailModal(null); setPortalEmailMsg(""); },
    onError: (e) => toast.error("Erro ao enviar e-mail", { description: e.message }),
  });

  const currentClient = clients.find((c) => c.id === editingId);

  function copyPortalLink(token: string) {
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Link copiado!"));
  }

  function handleGenerateToken() {
    if (!editingId) return;
    generateTokenMutation.mutate({
      clientId: editingId,
      label: newTokenLabel || "Acesso padrão",
      expiresDays: parseInt(newTokenDays) as 30 | 60 | 90 | 180 | 365,
    });
  }

  function handleSendPortalLink() {
    if (!portalEmailModal || !currentClient?.email) return;
    sendPortalLinkMutation.mutate({
      clientId: editingId!,
      clientName: currentClient.name,
      clientEmail: currentClient.email,
      token: portalEmailModal.token,
      origin: window.location.origin,
      customMessage: portalEmailMsg || undefined,
    });
  }

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setActiveTab("dados");
    setModalOpen(true);
  }

  function openEdit(c: typeof clients[0]) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      clinic: c.clinic ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      city: c.city ?? "",
      state: c.state ?? "",
    });
    setActiveTab("dados");
    setShowBlockForm(false);
    setBlockForm(emptyBlockForm);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setShowBlockForm(false);
    setBlockForm(emptyBlockForm);
  }

  function handleSubmit() {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  }

  function handleCreateBlock() {
    if (!editingId) return;
    const start = parseInt(blockForm.blockStart);
    const end = parseInt(blockForm.blockEnd);
    if (isNaN(start) || isNaN(end)) { toast.error("Números inválidos"); return; }
    if (end <= start) { toast.error("O número final deve ser maior que o inicial"); return; }
    createBlockMutation.mutate({
      clientId: editingId,
      blockStart: start,
      blockEnd: end,
      description: blockForm.description || undefined,
    });
  }

  const getInitials = (name: string) =>
    name.split(" ").filter((_, i, arr) => i === 0 || i === arr.length - 1).map((n) => n[0]).join("").toUpperCase();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <motion.div variants={{ animate: { transition: { staggerChildren: 0.06 } } }} initial="initial" animate="animate" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">Gerencie seus dentistas e clínicas parceiras</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading font-semibold" onClick={openNew}>
          <Plus size={18} className="mr-2" />
          Novo Cliente
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp}>
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por nome, clínica ou cidade..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 rounded-xl bg-muted/50 border-0 text-sm font-body placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                {([["all", "Todos"], ["active", "Ativos"], ["inactive", "Inativos"]] as const).map(([val, label]) => (
                  <Button
                    key={val}
                    variant={statusFilter === val ? "default" : "outline"}
                    size="sm"
                    className={`text-xs font-body ${statusFilter === val ? "bg-primary text-primary-foreground" : ""}`}
                    onClick={() => setStatusFilter(val)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && clients.length === 0 && (
        <motion.div variants={fadeUp} className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-lg font-heading font-semibold mb-2">Nenhum cliente encontrado</p>
          <p className="text-sm font-body mb-4">Comece adicionando seu primeiro cliente.</p>
          <Button onClick={openNew} className="bg-primary text-primary-foreground">
            <Plus size={16} className="mr-2" /> Adicionar Cliente
          </Button>
        </motion.div>
      )}

      {/* Client Cards */}
      {!isLoading && clients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((client) => (
            <motion.div key={client.id} variants={fadeUp}>
              <Card className="border border-border/60 shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer" onClick={() => openEdit(client)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-heading font-bold">
                          {getInitials(client.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-sm font-heading font-bold text-foreground">{client.name}</h3>
                        <p className="text-xs text-muted-foreground font-body">{client.clinic || "—"}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="font-body">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(client); }}>Editar</DropdownMenuItem>
                        {isAdmin && (
                          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: client.id }); }}>Excluir</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2 mb-4">
                    {client.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone size={13} className="shrink-0" /><span className="font-body">{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail size={13} className="shrink-0" /><span className="font-body truncate">{client.email}</span>
                      </div>
                    )}
                    {client.city && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin size={13} className="shrink-0" /><span className="font-body">{client.city}{client.state ? `, ${client.state}` : ""}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/60">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground font-body">Trabalhos</p>
                        <p className="text-sm font-heading font-bold text-foreground">{client.totalJobs}</p>
                      </div>
                      {isAdmin && (
                        <div>
                          <p className="text-xs text-muted-foreground font-body">Receita</p>
                          <p className="text-sm font-heading font-bold text-foreground">R$ {parseFloat(String(client.totalRevenue)).toLocaleString("pt-BR")}</p>
                        </div>
                      )}
                    </div>
                    <Badge className={`border-0 text-xs font-medium ${client.status === "active" ? "bg-success-light text-success" : "bg-muted text-muted-foreground"}`}>
                      {client.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination info */}
      {!isLoading && clients.length > 0 && (
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground font-body">
            Mostrando <span className="font-semibold text-foreground">{clients.length}</span> clientes
          </p>
        </motion.div>
      )}

      {/* Modal Create/Edit with Tabs */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">{editingId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>

          {editingId ? (
            <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dados" className="font-body text-sm">Dados Cadastrais</TabsTrigger>
                <TabsTrigger value="blocos" className="font-body text-sm">
                  <Package size={14} className="mr-1.5" />
                  Blocos de OS
                </TabsTrigger>
                <TabsTrigger value="portal" className="font-body text-sm">
                  <Globe size={14} className="mr-1.5" />
                  Portal
                </TabsTrigger>
              </TabsList>

              {/* Tab: Dados Cadastrais */}
              <TabsContent value="dados" className="mt-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label className="font-body text-sm">Nome *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. João Silva" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-body text-sm">Clínica</Label>
                    <Input value={form.clinic} onChange={(e) => setForm({ ...form, clinic: e.target.value })} placeholder="Clínica Sorriso" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="font-body text-sm">Email</Label>
                      <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@clinica.com" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="font-body text-sm">Telefone</Label>
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2 col-span-2">
                      <Label className="font-body text-sm">Cidade</Label>
                      <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="São Paulo" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="font-body text-sm">UF</Label>
                      <Input maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} placeholder="SP" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={closeModal}>Cancelar</Button>
                  <Button onClick={handleSubmit} disabled={isSaving} className="bg-primary text-primary-foreground">
                    {isSaving && <Loader2 size={16} className="mr-2 animate-spin" />}
                    Salvar
                  </Button>
                </div>
              </TabsContent>

              {/* Tab: Blocos de OS */}
              <TabsContent value="blocos" className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-heading font-semibold text-foreground">Blocos de Ordem de Serviço</p>
                      <p className="text-xs text-muted-foreground font-body mt-0.5">
                        Cadastre os blocos de OS deste cliente. O sistema identificará automaticamente o dono de cada OS pelo número.
                      </p>
                    </div>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant={showBlockForm ? "outline" : "default"}
                        className={!showBlockForm ? "bg-primary text-primary-foreground" : ""}
                        onClick={() => setShowBlockForm(!showBlockForm)}
                      >
                        {showBlockForm ? <X size={14} className="mr-1" /> : <Plus size={14} className="mr-1" />}
                        {showBlockForm ? "Cancelar" : "Novo Bloco"}
                      </Button>
                    )}
                  </div>

                  {/* Form to add new block */}
                  {showBlockForm && isAdmin && (
                    <Card className="border border-primary/20 bg-primary/5">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-5 gap-3 items-end">
                          <div className="col-span-1">
                            <Label className="font-body text-xs">OS Inicial *</Label>
                            <Input
                              type="number"
                              value={blockForm.blockStart}
                              onChange={(e) => setBlockForm({ ...blockForm, blockStart: e.target.value })}
                              placeholder="1201"
                              className="mt-1"
                            />
                          </div>
                          <div className="col-span-1">
                            <Label className="font-body text-xs">OS Final *</Label>
                            <Input
                              type="number"
                              value={blockForm.blockEnd}
                              onChange={(e) => setBlockForm({ ...blockForm, blockEnd: e.target.value })}
                              placeholder="1300"
                              className="mt-1"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="font-body text-xs">Descrição</Label>
                            <Input
                              value={blockForm.description}
                              onChange={(e) => setBlockForm({ ...blockForm, description: e.target.value })}
                              placeholder="Bloco 13 - Jan/2026"
                              className="mt-1"
                            />
                          </div>
                          <Button
                            onClick={handleCreateBlock}
                            disabled={createBlockMutation.isPending}
                            className="bg-primary text-primary-foreground"
                          >
                            {createBlockMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} className="mr-1" />}
                            Adicionar
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground font-body mt-2">
                          As ordens de serviço são entregues em blocos de 100. Ex: 1201 a 1300.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Existing blocks */}
                  {blocksLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="animate-spin text-primary" size={24} />
                    </div>
                  ) : blocks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Package size={32} className="mb-2 opacity-40" />
                      <p className="text-sm font-body">Nenhum bloco de OS cadastrado para este cliente.</p>
                      {isAdmin && (
                        <p className="text-xs font-body mt-1">Clique em "Novo Bloco" para cadastrar o primeiro.</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {blocks.map((block: any) => (
                        <div
                          key={block.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/40 hover:border-primary/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                              <Hash size={18} className="text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-heading font-semibold text-foreground">
                                OS {block.blockStart} — {block.blockEnd}
                              </p>
                              <p className="text-xs text-muted-foreground font-body">
                                {block.blockEnd - block.blockStart + 1} ordens
                                {block.description ? ` · ${block.description}` : ""}
                              </p>
                            </div>
                          </div>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteBlockMutation.mutate({ id: block.id })}
                              disabled={deleteBlockMutation.isPending}
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Tab: Portal do Cliente */}
              <TabsContent value="portal" className="mt-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-heading font-semibold text-foreground">Portal do Cliente</p>
                    <p className="text-xs text-muted-foreground font-body mt-0.5">
                      Gere links de acesso para o cliente acompanhar suas OS em tempo real, sem precisar fazer login.
                    </p>
                  </div>

                  {/* Gerar novo token */}
                  {isAdmin && (
                    <Card className="border border-primary/20 bg-primary/5">
                      <CardContent className="p-4">
                        <p className="text-xs font-heading font-semibold text-foreground mb-3">Gerar novo link de acesso</p>
                        <div className="grid grid-cols-5 gap-3 items-end">
                          <div className="col-span-2">
                            <Label className="font-body text-xs">Rótulo</Label>
                            <Input
                              value={newTokenLabel}
                              onChange={(e) => setNewTokenLabel(e.target.value)}
                              placeholder="Ex: Acesso 2026"
                              className="mt-1 h-9 text-sm"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="font-body text-xs">Validade</Label>
                            <Select value={newTokenDays} onValueChange={(v) => setNewTokenDays(v as typeof newTokenDays)}>
                              <SelectTrigger className="mt-1 h-9 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="30">30 dias</SelectItem>
                                <SelectItem value="60">60 dias</SelectItem>
                                <SelectItem value="90">90 dias</SelectItem>
                                <SelectItem value="180">6 meses</SelectItem>
                                <SelectItem value="365">1 ano</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            onClick={handleGenerateToken}
                            disabled={generateTokenMutation.isPending}
                            className="bg-primary text-primary-foreground h-9"
                          >
                            {generateTokenMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} className="mr-1" />}
                            Gerar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Lista de tokens */}
                  {tokensLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="animate-spin text-primary" size={24} />
                    </div>
                  ) : !portalTokens || portalTokens.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Globe size={32} className="mb-2 opacity-40" />
                      <p className="text-sm font-body">Nenhum link de acesso gerado.</p>
                      {isAdmin && <p className="text-xs font-body mt-1">Gere um link para compartilhar com o cliente.</p>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {portalTokens.map((t: any) => {
                        const isExpired = new Date(t.expiresAt) < new Date();
                        const daysLeft = Math.ceil((new Date(t.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        return (
                          <div
                            key={t.id}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-colors
                              ${!t.isActive || isExpired ? "bg-muted/30 border-border/30 opacity-60" : "bg-muted/50 border-border/40 hover:border-primary/30"}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0
                                ${!t.isActive || isExpired ? "bg-muted" : "bg-primary/10"}`}>
                                {!t.isActive || isExpired
                                  ? <ShieldOff size={16} className="text-muted-foreground" />
                                  : <Globe size={16} className="text-primary" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-heading font-semibold text-foreground truncate">{t.label}</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {!t.isActive ? (
                                    <span className="text-xs text-destructive font-medium">Revogado</span>
                                  ) : isExpired ? (
                                    <span className="text-xs text-amber-600 font-medium">Expirado</span>
                                  ) : (
                                    <span className={`text-xs font-medium ${daysLeft <= 7 ? "text-amber-600" : "text-emerald-600"}`}>
                                      {daysLeft <= 7 ? <AlertTriangle size={10} className="inline mr-0.5" /> : <CheckCircle2 size={10} className="inline mr-0.5" />}
                                      Válido por {daysLeft}d
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    <Clock size={10} className="inline mr-0.5" />{t.accessCount} acessos
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {t.isActive && !isExpired && (
                                <>
                                  <Button
                                    variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                                    onClick={() => copyPortalLink(t.token)}
                                    title="Copiar link"
                                  >
                                    <Copy size={14} />
                                  </Button>
                                  <Button
                                    variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                                    onClick={() => window.open(`${window.location.origin}/portal/${t.token}`, "_blank")}
                                    title="Abrir portal"
                                  >
                                    <ExternalLink size={14} />
                                  </Button>
                                  {currentClient?.email && (
                                    <Button
                                      variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                                      onClick={() => setPortalEmailModal({ token: t.token, tokenId: t.id })}
                                      title="Enviar por e-mail"
                                    >
                                      <Send size={14} />
                                    </Button>
                                  )}
                                  {isAdmin && (
                                    <Button
                                      variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                                      onClick={() => revokeTokenMutation.mutate({ tokenId: t.id })}
                                      disabled={revokeTokenMutation.isPending}
                                      title="Revogar acesso"
                                    >
                                      <ShieldOff size={14} />
                                    </Button>
                                  )}
                                </>
                              )}
                              {isAdmin && (
                                <Button
                                  variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteTokenMutation.mutate({ tokenId: t.id })}
                                  disabled={deleteTokenMutation.isPending}
                                  title="Remover"
                                >
                                  <Trash size={14} />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Modal de envio de e-mail do portal */}
            <Dialog open={!!portalEmailModal} onOpenChange={(o) => { if (!o) { setPortalEmailModal(null); setPortalEmailMsg(""); } }}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-heading">Enviar Link do Portal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label className="font-body text-sm">Destinatário</Label>
                    <Input
                      value={currentClient?.email ?? ""}
                      disabled
                      className="mt-1 bg-muted/50 text-muted-foreground"
                    />
                  </div>
                  <div>
                    <Label className="font-body text-sm">Mensagem personalizada (opcional)</Label>
                    <Textarea
                      value={portalEmailMsg}
                      onChange={(e) => setPortalEmailMsg(e.target.value)}
                      placeholder="Ex: Olá! Segue o link para acompanhar suas OS..."
                      className="mt-1 resize-none"
                      rows={3}
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-right">{portalEmailMsg.length}/500</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">O e-mail incluirá:</p>
                    <ul className="space-y-0.5 list-disc list-inside">
                      <li>Link de acesso ao portal</li>
                      <li>Logo e dados do laboratório</li>
                      <li>Sua mensagem personalizada</li>
                    </ul>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setPortalEmailModal(null); setPortalEmailMsg(""); }}>Cancelar</Button>
                  <Button
                    onClick={handleSendPortalLink}
                    disabled={sendPortalLinkMutation.isPending || !currentClient?.email}
                    className="bg-primary text-primary-foreground"
                  >
                    {sendPortalLinkMutation.isPending ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Send size={16} className="mr-2" />}
                    Enviar E-mail
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </>
          ) : (
            /* New client: only show form */
            <>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label className="font-body text-sm">Nome *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. João Silva" />
                </div>
                <div className="grid gap-2">
                  <Label className="font-body text-sm">Clínica</Label>
                  <Input value={form.clinic} onChange={(e) => setForm({ ...form, clinic: e.target.value })} placeholder="Clínica Sorriso" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="font-body text-sm">Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@clinica.com" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-body text-sm">Telefone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2 col-span-2">
                    <Label className="font-body text-sm">Cidade</Label>
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="São Paulo" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-body text-sm">UF</Label>
                    <Input maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} placeholder="SP" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeModal}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={isSaving} className="bg-primary text-primary-foreground">
                  {isSaving && <Loader2 size={16} className="mr-2 animate-spin" />}
                  Criar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
