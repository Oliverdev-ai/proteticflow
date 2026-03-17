/**
 * Estoque — ProteticFlow "Atelier Digital"
 * Módulo de Gestão de Estoque com:
 * - Lista de materiais com estoque atual vs. mínimo
 * - Alertas de reposição
 * - Entrada/saída de materiais
 * - Histórico de movimentações
 * - Gestão de fornecedores e categorias
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Package, Plus, Search, AlertTriangle, TrendingDown, TrendingUp,
  ArrowUpCircle, ArrowDownCircle, SlidersHorizontal, Loader2,
  MoreHorizontal, Truck, Tag, BarChart3, RefreshCw, Edit2, Trash2,
  ChevronDown, Box, DollarSign,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const fadeUp = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

// ─── Stock Level Helpers ───────────────────────────────────
function getStockLevel(current: string, min: string, max?: string | null) {
  const c = parseFloat(current);
  const m = parseFloat(min);
  const mx = max ? parseFloat(max) : null;

  if (c <= 0) return { label: "Esgotado", color: "text-danger", bg: "bg-danger-light", pct: 0 };
  if (c <= m) return { label: "Crítico", color: "text-danger", bg: "bg-danger-light", pct: Math.min((c / m) * 50, 50) };
  if (c <= m * 1.3) return { label: "Baixo", color: "text-amber-600", bg: "bg-amber-100", pct: 60 };
  if (mx && c >= mx * 0.9) return { label: "Máximo", color: "text-blue-600", bg: "bg-blue-100", pct: 100 };
  return { label: "Normal", color: "text-success", bg: "bg-success-light", pct: mx ? Math.min((c / mx) * 100, 100) : 75 };
}

function formatQty(value: string | number, unit: string) {
  const v = parseFloat(String(value));
  return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(2)} ${unit}`;
}

// ─── Category color map ────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700",
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700",
  emerald: "bg-emerald-100 text-emerald-700",
  rose: "bg-rose-100 text-rose-700",
  violet: "bg-violet-100 text-violet-700",
  orange: "bg-orange-100 text-orange-700",
  cyan: "bg-cyan-100 text-cyan-700",
};

// ─── Material Form ─────────────────────────────────────────
type MaterialForm = {
  name: string; unit: string; categoryId: string; supplierId: string;
  currentStock: string; minStock: string; maxStock: string; costPrice: string; notes: string;
};
const emptyMaterialForm: MaterialForm = {
  name: "", unit: "un", categoryId: "", supplierId: "",
  currentStock: "0", minStock: "0", maxStock: "", costPrice: "0", notes: "",
};

// ─── Movement Form ─────────────────────────────────────────
type MovementForm = {
  materialId: string; type: "in" | "out" | "adjustment";
  quantity: string; reason: string; invoiceNumber: string; unitCost: string; notes: string;
};
const emptyMovementForm: MovementForm = {
  materialId: "", type: "in", quantity: "", reason: "", invoiceNumber: "", unitCost: "", notes: "",
};

// ─── Supplier Form ─────────────────────────────────────────
type SupplierForm = { name: string; contact: string; email: string; phone: string; address: string; notes: string; };
const emptySupplierForm: SupplierForm = { name: "", contact: "", email: "", phone: "", address: "", notes: "" };

// ─── Category Form ─────────────────────────────────────────
type CategoryForm = { name: string; description: string; color: string; };
const emptyCategoryForm: CategoryForm = { name: "", description: "", color: "slate" };

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════
export default function Estoque() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [activeTab, setActiveTab] = useState("materials");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Material modal
  const [matModalOpen, setMatModalOpen] = useState(false);
  const [editingMatId, setEditingMatId] = useState<number | null>(null);
  const [matForm, setMatForm] = useState<MaterialForm>(emptyMaterialForm);

  // Movement modal
  const [movModalOpen, setMovModalOpen] = useState(false);
  const [movForm, setMovForm] = useState<MovementForm>(emptyMovementForm);

  // Supplier modal
  const [supModalOpen, setSupModalOpen] = useState(false);
  const [editingSupId, setEditingSupId] = useState<number | null>(null);
  const [supForm, setSupForm] = useState<SupplierForm>(emptySupplierForm);

  // Category modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState<CategoryForm>(emptyCategoryForm);

  const utils = trpc.useUtils();

  // Queries
  const { data: summary } = trpc.stock.materials.summary.useQuery();
  const { data: materialsList, isLoading: matsLoading } = trpc.stock.materials.list.useQuery({
    search: search || undefined,
    categoryId: categoryFilter !== "all" ? Number(categoryFilter) : undefined,
    lowStockOnly: lowStockFilter || undefined,
  });
  const { data: lowStockList } = trpc.stock.materials.lowStock.useQuery();
  const { data: categoriesList } = trpc.stock.categories.list.useQuery();
  const { data: suppliersList } = trpc.stock.suppliers.list.useQuery();
  const { data: movementsList, isLoading: movsLoading } = trpc.stock.movements.list.useQuery(
    { limit: 100 },
    { enabled: activeTab === "movements" }
  );

  // Mutations — Materials
  const createMatMutation = trpc.stock.materials.create.useMutation({
    onSuccess: () => { utils.stock.materials.list.invalidate(); utils.stock.materials.summary.invalidate(); toast.success("Material criado!"); closeMatModal(); },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });
  const updateMatMutation = trpc.stock.materials.update.useMutation({
    onSuccess: () => { utils.stock.materials.list.invalidate(); toast.success("Material atualizado!"); closeMatModal(); },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });
  const deactivateMatMutation = trpc.stock.materials.deactivate.useMutation({
    onSuccess: () => { utils.stock.materials.list.invalidate(); utils.stock.materials.summary.invalidate(); toast.success("Material removido."); },
  });

  // Mutations — Movements
  const registerMovMutation = trpc.stock.movements.register.useMutation({
    onSuccess: (r) => {
      utils.stock.materials.list.invalidate();
      utils.stock.materials.lowStock.invalidate();
      utils.stock.materials.summary.invalidate();
      utils.stock.movements.list.invalidate();
      utils.notifications.list.invalidate();
      if (r.isLow) {
        toast.warning(`Estoque baixo: ${r.materialName}`, { description: `Atual: ${r.stockAfter.toFixed(2)}` });
      } else {
        toast.success("Movimentação registrada!");
      }
      closeMovModal();
    },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  // Mutations — Suppliers
  const createSupMutation = trpc.stock.suppliers.create.useMutation({
    onSuccess: () => { utils.stock.suppliers.list.invalidate(); toast.success("Fornecedor criado!"); closeSupModal(); },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });
  const updateSupMutation = trpc.stock.suppliers.update.useMutation({
    onSuccess: () => { utils.stock.suppliers.list.invalidate(); toast.success("Fornecedor atualizado!"); closeSupModal(); },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  // Mutations — Categories
  const createCatMutation = trpc.stock.categories.create.useMutation({
    onSuccess: () => { utils.stock.categories.list.invalidate(); toast.success("Categoria criada!"); setCatModalOpen(false); setCatForm(emptyCategoryForm); },
    onError: (e) => toast.error("Erro", { description: e.message }),
  });

  const materials = materialsList ?? [];
  const categories = categoriesList ?? [];
  const suppliers = suppliersList ?? [];
  const movements = movementsList ?? [];
  const lowStock = lowStockList ?? [];

  // ─── Modal Handlers ──────────────────────────────────────
  function openNewMat() { setEditingMatId(null); setMatForm(emptyMaterialForm); setMatModalOpen(true); }
  function openEditMat(m: typeof materials[0]) {
    setEditingMatId(m.id);
    setMatForm({
      name: m.name, unit: m.unit,
      categoryId: m.categoryId ? String(m.categoryId) : "",
      supplierId: m.supplierId ? String(m.supplierId) : "",
      currentStock: m.currentStock, minStock: m.minStock,
      maxStock: m.maxStock ?? "", costPrice: m.costPrice, notes: m.notes ?? "",
    });
    setMatModalOpen(true);
  }
  function closeMatModal() { setMatModalOpen(false); setEditingMatId(null); setMatForm(emptyMaterialForm); }

  function openMovModal(materialId?: number) {
    setMovForm({ ...emptyMovementForm, materialId: materialId ? String(materialId) : "" });
    setMovModalOpen(true);
  }
  function closeMovModal() { setMovModalOpen(false); setMovForm(emptyMovementForm); }

  function openNewSup() { setEditingSupId(null); setSupForm(emptySupplierForm); setSupModalOpen(true); }
  function openEditSup(s: typeof suppliers[0]) {
    setEditingSupId(s.id);
    setSupForm({ name: s.name, contact: s.contact ?? "", email: s.email ?? "", phone: s.phone ?? "", address: s.address ?? "", notes: s.notes ?? "" });
    setSupModalOpen(true);
  }
  function closeSupModal() { setSupModalOpen(false); setEditingSupId(null); setSupForm(emptySupplierForm); }

  // ─── Submit Handlers ─────────────────────────────────────
  function handleMatSubmit() {
    if (!matForm.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!matForm.unit.trim()) { toast.error("Unidade é obrigatória"); return; }
    if (editingMatId) {
      updateMatMutation.mutate({
        id: editingMatId, name: matForm.name, unit: matForm.unit,
        categoryId: matForm.categoryId ? Number(matForm.categoryId) : undefined,
        supplierId: matForm.supplierId ? Number(matForm.supplierId) : undefined,
        minStock: matForm.minStock, maxStock: matForm.maxStock || undefined,
        costPrice: matForm.costPrice, notes: matForm.notes || undefined,
      });
    } else {
      createMatMutation.mutate({
        name: matForm.name, unit: matForm.unit,
        categoryId: matForm.categoryId ? Number(matForm.categoryId) : undefined,
        supplierId: matForm.supplierId ? Number(matForm.supplierId) : undefined,
        currentStock: matForm.currentStock, minStock: matForm.minStock,
        maxStock: matForm.maxStock || undefined, costPrice: matForm.costPrice,
        notes: matForm.notes || undefined,
      });
    }
  }

  function handleMovSubmit() {
    if (!movForm.materialId) { toast.error("Selecione um material"); return; }
    if (!movForm.quantity || parseFloat(movForm.quantity) <= 0) { toast.error("Quantidade inválida"); return; }
    registerMovMutation.mutate({
      materialId: Number(movForm.materialId),
      type: movForm.type,
      quantity: movForm.quantity,
      reason: movForm.reason || undefined,
      invoiceNumber: movForm.invoiceNumber || undefined,
      unitCost: movForm.unitCost || undefined,
      notes: movForm.notes || undefined,
    });
  }

  function handleSupSubmit() {
    if (!supForm.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (editingSupId) {
      updateSupMutation.mutate({ id: editingSupId, ...supForm });
    } else {
      createSupMutation.mutate(supForm);
    }
  }

  const isSavingMat = createMatMutation.isPending || updateMatMutation.isPending;
  const isSavingMov = registerMovMutation.isPending;
  const isSavingSup = createSupMutation.isPending || updateSupMutation.isPending;

  // ─── Render ───────────────────────────────────────────────
  return (
    <motion.div variants={{ animate: { transition: { staggerChildren: 0.06 } } }} initial="initial" animate="animate" className="space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Estoque</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">Controle de materiais, fornecedores e movimentações</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="font-body text-xs" onClick={() => openMovModal()}>
            <ArrowUpCircle size={14} className="mr-1.5 text-success" /> Entrada
          </Button>
          <Button variant="outline" size="sm" className="font-body text-xs" onClick={() => { setMovForm({ ...emptyMovementForm, type: "out" }); setMovModalOpen(true); }}>
            <ArrowDownCircle size={14} className="mr-1.5 text-danger" /> Saída
          </Button>
          {isAdmin && (
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading font-semibold text-sm" onClick={openNewMat}>
              <Plus size={16} className="mr-1.5" /> Novo Material
            </Button>
          )}
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Materiais Ativos", value: summary?.totalMaterials ?? 0, icon: Box, color: "text-primary", bg: "bg-primary/10" },
          { label: "Abaixo do Mínimo", value: summary?.lowStockCount ?? 0, icon: AlertTriangle, color: summary?.lowStockCount ? "text-danger" : "text-muted-foreground", bg: summary?.lowStockCount ? "bg-danger-light" : "bg-muted/50" },
          { label: "Categorias", value: summary?.categories ?? 0, icon: Tag, color: "text-blue-600", bg: "bg-blue-100" },
          { label: "Valor em Estoque", value: `R$ ${(summary?.totalValue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-success", bg: "bg-success-light" },
        ].map((s) => (
          <Card key={s.label} className="p-4 border border-border/60 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <p className="text-xs font-body text-muted-foreground">{s.label}</p>
                <p className="text-xl font-heading font-bold text-foreground">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Low Stock Alert Banner */}
      {lowStock.length > 0 && (
        <motion.div variants={fadeUp}>
          <Card className="border border-danger/30 bg-danger-light/40 shadow-sm">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-danger" />
                <h3 className="text-sm font-heading font-bold text-danger">
                  {lowStock.length} material{lowStock.length !== 1 ? "is" : ""} abaixo do estoque mínimo
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {lowStock.slice(0, 8).map((m: any) => (
                  <Badge key={m.id} className="bg-danger-light text-danger border border-danger/20 text-xs font-body px-2 py-1">
                    {m.name}: {formatQty(m.currentStock, m.unit)} / mín {formatQty(m.minStock, m.unit)}
                  </Badge>
                ))}
                {lowStock.length > 8 && (
                  <Badge variant="outline" className="text-xs font-body">+{lowStock.length - 8} mais</Badge>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Main Tabs */}
      <motion.div variants={fadeUp}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 border border-border/40 mb-4">
            <TabsTrigger value="materials" className="font-body text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Package size={14} className="mr-1.5" /> Materiais
            </TabsTrigger>
            <TabsTrigger value="movements" className="font-body text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <BarChart3 size={14} className="mr-1.5" /> Movimentações
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="font-body text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Truck size={14} className="mr-1.5" /> Fornecedores
            </TabsTrigger>
          </TabsList>

          {/* ─── Materials Tab ──────────────────────────────── */}
          <TabsContent value="materials" className="space-y-4">
            {/* Filters */}
            <Card className="border border-border/60 shadow-sm">
              <div className="p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" placeholder="Buscar material..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-4 rounded-xl bg-muted/50 border-0 text-sm font-body placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px] h-9 text-xs font-body">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant={lowStockFilter ? "default" : "outline"}
                  size="sm"
                  className={`text-xs font-body ${lowStockFilter ? "bg-danger text-white" : ""}`}
                  onClick={() => setLowStockFilter(!lowStockFilter)}
                >
                  <AlertTriangle size={13} className="mr-1.5" /> Críticos
                </Button>
                {isAdmin && (
                  <Button variant="outline" size="sm" className="text-xs font-body" onClick={() => setCatModalOpen(true)}>
                    <Tag size={13} className="mr-1.5" /> Nova Categoria
                  </Button>
                )}
              </div>
            </Card>

            {/* Materials Table */}
            {matsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>
            ) : materials.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Package size={40} className="mb-3 opacity-30" />
                <p className="text-base font-heading font-semibold mb-1">Nenhum material encontrado</p>
                <p className="text-sm font-body mb-4">Cadastre materiais para controlar o estoque.</p>
                {isAdmin && <Button onClick={openNewMat} className="bg-primary text-primary-foreground"><Plus size={15} className="mr-1.5" /> Novo Material</Button>}
              </div>
            ) : (
              <Card className="border border-border/60 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30">
                        {["Material", "Categoria", "Estoque Atual", "Mínimo", "Situação", "Fornecedor", ""].map(h => (
                          <th key={h} className="text-left p-3 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((m: any) => {
                        const level = getStockLevel(m.currentStock, m.minStock, m.maxStock);
                        const pct = Math.min(
                          m.maxStock
                            ? (parseFloat(m.currentStock) / parseFloat(m.maxStock)) * 100
                            : parseFloat(m.currentStock) <= parseFloat(m.minStock) ? 20 : 70,
                          100
                        );
                        return (
                          <tr key={m.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                            <td className="p-3">
                              <div className="font-body font-medium text-sm text-foreground">{m.name}</div>
                              <div className="text-xs text-muted-foreground font-body">Custo: R$ {parseFloat(m.costPrice).toFixed(2)}/{m.unit}</div>
                            </td>
                            <td className="p-3">
                              {m.categoryName ? (
                                <Badge className={`text-[10px] font-body px-2 py-0.5 border-0 ${CATEGORY_COLORS[m.categoryColor || "slate"] || CATEGORY_COLORS.slate}`}>
                                  {m.categoryName}
                                </Badge>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2 min-w-[120px]">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className={`text-xs font-body font-semibold ${level.color}`}>
                                      {formatQty(m.currentStock, m.unit)}
                                    </span>
                                  </div>
                                  <Progress
                                    value={pct}
                                    className="h-1.5"
                                    style={{ "--progress-color": parseFloat(m.currentStock) <= parseFloat(m.minStock) ? "var(--color-danger)" : "var(--color-success)" } as any}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="text-xs font-body text-muted-foreground">{formatQty(m.minStock, m.unit)}</span>
                            </td>
                            <td className="p-3">
                              <Badge className={`text-[10px] font-body px-2 py-0.5 border-0 ${level.bg} ${level.color}`}>
                                {level.label}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <span className="text-xs font-body text-muted-foreground">{m.supplierName || "—"}</span>
                            </td>
                            <td className="p-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreHorizontal size={14} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  <DropdownMenuItem onClick={() => openMovModal(m.id)} className="text-xs font-body">
                                    <ArrowUpCircle size={13} className="mr-2 text-success" /> Entrada
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setMovForm({ ...emptyMovementForm, materialId: String(m.id), type: "out" }); setMovModalOpen(true); }} className="text-xs font-body">
                                    <ArrowDownCircle size={13} className="mr-2 text-danger" /> Saída
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setMovForm({ ...emptyMovementForm, materialId: String(m.id), type: "adjustment" }); setMovModalOpen(true); }} className="text-xs font-body">
                                    <RefreshCw size={13} className="mr-2 text-blue-500" /> Ajuste
                                  </DropdownMenuItem>
                                  {isAdmin && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => openEditMat(m)} className="text-xs font-body">
                                        <Edit2 size={13} className="mr-2" /> Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => deactivateMatMutation.mutate({ id: m.id })} className="text-xs font-body text-danger focus:text-danger">
                                        <Trash2 size={13} className="mr-2" /> Remover
                                      </DropdownMenuItem>
                                    </>
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
            )}
          </TabsContent>

          {/* ─── Movements Tab ──────────────────────────────── */}
          <TabsContent value="movements" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-body text-muted-foreground">Últimas 100 movimentações</p>
              <Button size="sm" className="bg-primary text-primary-foreground text-xs font-body" onClick={() => openMovModal()}>
                <Plus size={14} className="mr-1.5" /> Registrar Movimentação
              </Button>
            </div>

            {movsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>
            ) : movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <BarChart3 size={40} className="mb-3 opacity-30" />
                <p className="text-base font-heading font-semibold">Nenhuma movimentação registrada</p>
              </div>
            ) : (
              <Card className="border border-border/60 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30">
                        {["Data", "Material", "Tipo", "Quantidade", "Estoque Após", "Motivo", "NF"].map(h => (
                          <th key={h} className="text-left p-3 text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((mv: any) => (
                        <tr key={mv.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                          <td className="p-3 text-xs font-body text-muted-foreground whitespace-nowrap">
                            {new Date(mv.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="p-3 text-sm font-body font-medium text-foreground">{mv.materialName}</td>
                          <td className="p-3">
                            <Badge className={`text-[10px] font-body px-2 border-0 ${mv.type === "in" ? "bg-success-light text-success" : mv.type === "out" ? "bg-danger-light text-danger" : "bg-blue-100 text-blue-700"}`}>
                              {mv.type === "in" ? "Entrada" : mv.type === "out" ? "Saída" : "Ajuste"}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <span className={`text-sm font-body font-semibold ${mv.type === "in" ? "text-success" : mv.type === "out" ? "text-danger" : "text-blue-600"}`}>
                              {mv.type === "out" ? "-" : mv.type === "in" ? "+" : "→"}{formatQty(mv.quantity, mv.materialUnit || "")}
                            </span>
                          </td>
                          <td className="p-3 text-sm font-body text-muted-foreground">{formatQty(mv.stockAfter, mv.materialUnit || "")}</td>
                          <td className="p-3 text-xs font-body text-muted-foreground max-w-[160px] truncate">{mv.reason || "—"}</td>
                          <td className="p-3 text-xs font-body text-muted-foreground">{mv.invoiceNumber || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ─── Suppliers Tab ──────────────────────────────── */}
          <TabsContent value="suppliers" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-body text-muted-foreground">{suppliers.length} fornecedor{suppliers.length !== 1 ? "es" : ""} ativo{suppliers.length !== 1 ? "s" : ""}</p>
              {isAdmin && (
                <Button size="sm" className="bg-primary text-primary-foreground text-xs font-body" onClick={openNewSup}>
                  <Plus size={14} className="mr-1.5" /> Novo Fornecedor
                </Button>
              )}
            </div>

            {suppliers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Truck size={40} className="mb-3 opacity-30" />
                <p className="text-base font-heading font-semibold">Nenhum fornecedor cadastrado</p>
                {isAdmin && <Button onClick={openNewSup} className="mt-4 bg-primary text-primary-foreground text-sm"><Plus size={14} className="mr-1.5" /> Novo Fornecedor</Button>}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suppliers.map((s: any) => (
                  <Card key={s.id} className="border border-border/60 shadow-sm p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-heading font-bold text-foreground truncate">{s.name}</h3>
                        {s.contact && <p className="text-xs font-body text-muted-foreground mt-0.5">{s.contact}</p>}
                        {s.phone && <p className="text-xs font-body text-muted-foreground">{s.phone}</p>}
                        {s.email && <p className="text-xs font-body text-primary/70 truncate">{s.email}</p>}
                        {s.notes && <p className="text-xs font-body text-muted-foreground mt-1 line-clamp-2">{s.notes}</p>}
                      </div>
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                              <MoreHorizontal size={14} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditSup(s)} className="text-xs font-body">
                              <Edit2 size={13} className="mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateSupMutation.mutate({ id: s.id, isActive: false })} className="text-xs font-body text-danger focus:text-danger">
                              <Trash2 size={13} className="mr-2" /> Desativar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ─── Material Modal ──────────────────────────────────── */}
      <Dialog open={matModalOpen} onOpenChange={setMatModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">{editingMatId ? "Editar Material" : "Novo Material"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-body">Nome *</Label>
                <Input value={matForm.name} onChange={e => setMatForm({ ...matForm, name: e.target.value })} placeholder="Ex: Resina Acrílica Incolor" className="font-body text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-body">Unidade *</Label>
                <Select value={matForm.unit} onValueChange={v => setMatForm({ ...matForm, unit: v })}>
                  <SelectTrigger className="font-body text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["un", "cx", "kg", "g", "L", "ml", "m", "cm", "rolo", "par", "pct"].map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-body">Categoria</Label>
                <Select value={matForm.categoryId || "none"} onValueChange={v => setMatForm({ ...matForm, categoryId: v === "none" ? "" : v })}>
                  <SelectTrigger className="font-body text-sm"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-body">Fornecedor</Label>
                <Select value={matForm.supplierId || "none"} onValueChange={v => setMatForm({ ...matForm, supplierId: v === "none" ? "" : v })}>
                  <SelectTrigger className="font-body text-sm"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem fornecedor</SelectItem>
                    {suppliers.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {!editingMatId && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-body">Estoque Inicial</Label>
                  <Input type="number" min="0" step="0.001" value={matForm.currentStock} onChange={e => setMatForm({ ...matForm, currentStock: e.target.value })} className="font-body text-sm" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-body">Estoque Mínimo</Label>
                <Input type="number" min="0" step="0.001" value={matForm.minStock} onChange={e => setMatForm({ ...matForm, minStock: e.target.value })} className="font-body text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-body">Estoque Máximo</Label>
                <Input type="number" min="0" step="0.001" value={matForm.maxStock} onChange={e => setMatForm({ ...matForm, maxStock: e.target.value })} placeholder="Opcional" className="font-body text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-body">Custo Unitário (R$)</Label>
                <Input type="number" min="0" step="0.01" value={matForm.costPrice} onChange={e => setMatForm({ ...matForm, costPrice: e.target.value })} className="font-body text-sm" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-body">Observações</Label>
                <Textarea value={matForm.notes} onChange={e => setMatForm({ ...matForm, notes: e.target.value })} rows={2} className="font-body text-sm resize-none" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeMatModal} className="font-body text-sm">Cancelar</Button>
            <Button onClick={handleMatSubmit} disabled={isSavingMat} className="bg-primary text-primary-foreground font-heading font-semibold text-sm">
              {isSavingMat ? <Loader2 size={15} className="animate-spin mr-2" /> : null}
              {editingMatId ? "Salvar" : "Criar Material"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Movement Modal ──────────────────────────────────── */}
      <Dialog open={movModalOpen} onOpenChange={setMovModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {movForm.type === "in" ? "Registrar Entrada" : movForm.type === "out" ? "Registrar Saída" : "Ajuste de Estoque"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-body">Tipo de Movimentação</Label>
              <div className="flex gap-2">
                {[
                  { value: "in", label: "Entrada", icon: ArrowUpCircle, color: "text-success" },
                  { value: "out", label: "Saída", icon: ArrowDownCircle, color: "text-danger" },
                  { value: "adjustment", label: "Ajuste", icon: RefreshCw, color: "text-blue-500" },
                ].map(t => (
                  <Button
                    key={t.value}
                    variant={movForm.type === t.value ? "default" : "outline"}
                    size="sm"
                    className={`flex-1 text-xs font-body ${movForm.type === t.value ? "bg-primary text-primary-foreground" : ""}`}
                    onClick={() => setMovForm({ ...movForm, type: t.value as any })}
                  >
                    <t.icon size={13} className={`mr-1.5 ${movForm.type !== t.value ? t.color : ""}`} />
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-body">Material *</Label>
              <Select value={movForm.materialId || "none"} onValueChange={v => setMovForm({ ...movForm, materialId: v === "none" ? "" : v })}>
                <SelectTrigger className="font-body text-sm"><SelectValue placeholder="Selecionar material" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecionar...</SelectItem>
                  {(materialsList ?? []).map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name} ({formatQty(m.currentStock, m.unit)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-body">
                  {movForm.type === "adjustment" ? "Novo Estoque *" : "Quantidade *"}
                </Label>
                <Input type="number" min="0.001" step="0.001" value={movForm.quantity} onChange={e => setMovForm({ ...movForm, quantity: e.target.value })} placeholder="0" className="font-body text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-body">Custo Unitário (R$)</Label>
                <Input type="number" min="0" step="0.01" value={movForm.unitCost} onChange={e => setMovForm({ ...movForm, unitCost: e.target.value })} placeholder="0.00" className="font-body text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-body">Motivo / Descrição</Label>
              <Input value={movForm.reason} onChange={e => setMovForm({ ...movForm, reason: e.target.value })} placeholder="Ex: Compra mensal, Uso na OS 1250..." className="font-body text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-body">Nº da Nota Fiscal</Label>
              <Input value={movForm.invoiceNumber} onChange={e => setMovForm({ ...movForm, invoiceNumber: e.target.value })} placeholder="Opcional" className="font-body text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeMovModal} className="font-body text-sm">Cancelar</Button>
            <Button onClick={handleMovSubmit} disabled={isSavingMov} className="bg-primary text-primary-foreground font-heading font-semibold text-sm">
              {isSavingMov ? <Loader2 size={15} className="animate-spin mr-2" /> : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Supplier Modal ──────────────────────────────────── */}
      <Dialog open={supModalOpen} onOpenChange={setSupModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{editingSupId ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {[
              { key: "name", label: "Nome *", placeholder: "Ex: DentalSupply Brasil" },
              { key: "contact", label: "Contato", placeholder: "Nome do responsável" },
              { key: "phone", label: "Telefone", placeholder: "(11) 99999-9999" },
              { key: "email", label: "E-mail", placeholder: "contato@fornecedor.com" },
              { key: "address", label: "Endereço", placeholder: "Rua, cidade, estado" },
            ].map(f => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-xs font-body">{f.label}</Label>
                <Input value={(supForm as any)[f.key]} onChange={e => setSupForm({ ...supForm, [f.key]: e.target.value })} placeholder={f.placeholder} className="font-body text-sm" />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-xs font-body">Observações</Label>
              <Textarea value={supForm.notes} onChange={e => setSupForm({ ...supForm, notes: e.target.value })} rows={2} className="font-body text-sm resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeSupModal} className="font-body text-sm">Cancelar</Button>
            <Button onClick={handleSupSubmit} disabled={isSavingSup} className="bg-primary text-primary-foreground font-heading font-semibold text-sm">
              {isSavingSup ? <Loader2 size={15} className="animate-spin mr-2" /> : null}
              {editingSupId ? "Salvar" : "Criar Fornecedor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Category Modal ──────────────────────────────────── */}
      <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Nova Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-body">Nome *</Label>
              <Input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="Ex: Resinas, Metais, Cerâmicas..." className="font-body text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-body">Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(CATEGORY_COLORS).map(([color, cls]) => (
                  <button
                    key={color}
                    onClick={() => setCatForm({ ...catForm, color })}
                    className={`px-3 py-1 rounded-full text-xs font-body border-2 transition-all ${cls} ${catForm.color === color ? "border-primary scale-105" : "border-transparent"}`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-body">Descrição</Label>
              <Input value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} placeholder="Opcional" className="font-body text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatModalOpen(false)} className="font-body text-sm">Cancelar</Button>
            <Button onClick={() => createCatMutation.mutate(catForm)} disabled={createCatMutation.isPending} className="bg-primary text-primary-foreground font-heading font-semibold text-sm">
              {createCatMutation.isPending ? <Loader2 size={15} className="animate-spin mr-2" /> : null}
              Criar Categoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
}
