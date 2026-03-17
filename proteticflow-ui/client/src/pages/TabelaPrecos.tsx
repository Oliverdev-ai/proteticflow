/**
 * Tabela de Preços — ProteticFlow "Atelier Digital"
 * CRUD real via tRPC com categorias e busca
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Pencil, Trash2, Loader2, Tag } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const fadeUp = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

const categoryColors: Record<string, string> = {
  "Coroas": "bg-amber-light text-amber",
  "Próteses": "bg-sage-light text-sage",
  "Facetas": "bg-primary/10 text-primary",
  "Implantes": "bg-warning-light text-warning",
  "Provisórios": "bg-muted text-muted-foreground",
  "Restaurações": "bg-success-light text-success",
  "Núcleos": "bg-primary/10 text-primary",
  "Outros": "bg-muted text-muted-foreground",
};

type PriceForm = {
  name: string;
  category: string;
  price: string;
  estimatedDays: string;
};

const emptyForm: PriceForm = { name: "", category: "", price: "", estimatedDays: "" };

export default function TabelaPrecos() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PriceForm>(emptyForm);

  const utils = trpc.useUtils();
  const { data: pricesList, isLoading } = trpc.prices.list.useQuery({
    search: search || undefined,
  });

  const createMutation = trpc.prices.create.useMutation({
    onSuccess: () => { utils.prices.list.invalidate(); toast.success("Serviço adicionado!"); closeModal(); },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });
  const updateMutation = trpc.prices.update.useMutation({
    onSuccess: () => { utils.prices.list.invalidate(); toast.success("Serviço atualizado!"); closeModal(); },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });
  const deleteMutation = trpc.prices.delete.useMutation({
    onSuccess: () => { utils.prices.list.invalidate(); toast.success("Serviço removido."); },
  });

  const prices = pricesList ?? [];
  const categories = Array.from(new Set(prices.map(p => p.category))).filter(Boolean);

  function openNew() { setEditingId(null); setForm(emptyForm); setModalOpen(true); }

  function openEdit(p: typeof prices[0]) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      category: p.category ?? "",
      price: String(p.price),
      estimatedDays: p.estimatedDays ? String(p.estimatedDays) : "",
    });
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditingId(null); setForm(emptyForm); }

  function handleSubmit() {
    if (!form.name.trim()) { toast.error("Nome do serviço é obrigatório"); return; }
    if (!form.price) { toast.error("Preço é obrigatório"); return; }
    const data = {
      name: form.name,
      category: form.category || "Outros",
      price: form.price,
      estimatedDays: form.estimatedDays ? Number(form.estimatedDays) : undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Group by category
  const grouped = prices.reduce<Record<string, typeof prices>>((acc, p) => {
    const cat = p.category || "Outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <motion.div variants={{ animate: { transition: { staggerChildren: 0.06 } } }} initial="initial" animate="animate" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Tabela de Preços</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">Gerencie os valores dos serviços do laboratório</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading font-semibold" onClick={openNew}>
          <Plus size={18} className="mr-2" /> Novo Serviço
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp}>
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder="Buscar serviço..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 rounded-xl bg-muted/50 border-0 text-sm font-body placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant={catFilter === "all" ? "default" : "outline"} size="sm"
                  className={`text-xs font-body ${catFilter === "all" ? "bg-primary text-primary-foreground" : ""}`}
                  onClick={() => setCatFilter("all")}>Todos</Button>
                {categories.map((cat) => (
                  <Button key={cat} variant={catFilter === cat ? "default" : "outline"} size="sm"
                    className={`text-xs font-body ${catFilter === cat ? "bg-primary text-primary-foreground" : ""}`}
                    onClick={() => setCatFilter(cat)}>{cat}</Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Loading */}
      {isLoading && <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>}

      {/* Empty State */}
      {!isLoading && prices.length === 0 && (
        <motion.div variants={fadeUp} className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-lg font-heading font-semibold mb-2">Nenhum serviço cadastrado</p>
          <p className="text-sm font-body mb-4">Adicione os serviços e valores do seu laboratório.</p>
          <Button onClick={openNew} className="bg-primary text-primary-foreground"><Plus size={16} className="mr-2" /> Adicionar Serviço</Button>
        </motion.div>
      )}

      {/* Price Cards by Category */}
      {!isLoading && Object.entries(grouped).map(([category, items]) => (
        <motion.div key={category} variants={fadeUp}>
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Badge className={`${categoryColors[category] || categoryColors["Outros"]} border-0 text-xs font-medium`}>{category}</Badge>
                <span className="text-xs text-muted-foreground font-body">{items.length} serviços</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="text-left pb-2 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Serviço</th>
                      <th className="text-right pb-2 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">Preço</th>
                      <th className="text-right pb-2 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Prazo (dias)</th>
                      <th className="text-right pb-2 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Tag size={14} className="text-primary" />
                            </div>
                            <span className="text-sm font-body font-medium text-foreground">{item.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-right text-sm font-heading font-bold text-foreground">
                          R$ {parseFloat(String(item.price)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 text-right text-sm text-muted-foreground font-body hidden sm:table-cell">
                          {item.estimatedDays ?? "—"}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                              <Pencil size={14} className="text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate({ id: item.id })}>
                              <Trash2 size={14} className="text-danger" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Modal Create/Edit */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{editingId ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="font-body text-sm">Nome do Serviço *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Coroa Metalocerâmica" />
            </div>
            <div className="grid gap-2">
              <Label className="font-body text-sm">Categoria</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Coroas, Próteses, Facetas..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="font-body text-sm">Preço (R$) *</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="850.00" />
              </div>
              <div className="grid gap-2">
                <Label className="font-body text-sm">Prazo (dias)</Label>
                <Input type="number" value={form.estimatedDays} onChange={(e) => setForm({ ...form, estimatedDays: e.target.value })} placeholder="5" />
              </div>
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
