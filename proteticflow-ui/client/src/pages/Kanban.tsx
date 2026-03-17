/**
 * Kanban — ProteticFlow "Atelier Digital"
 * Quadro de produção com drag-and-drop, histórico de movimentações,
 * atribuição de responsável e métricas de produção.
 */
import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import {
  Search, Filter, Loader2, Calendar, Clock, User, Hash,
  GripVertical, AlertTriangle, CheckCircle2,
  Package, Wrench, Eye, Truck, ArrowRight, History,
  BarChart2, Zap, TrendingUp, UserCheck, ChevronRight,
  X, ArrowRightLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Status Configuration ─────────────────────────────────
interface StatusConfig {
  key: string;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  borderColor: string;
  headerBg: string;
  badgeBg: string;
}

const STATUS_CONFIG: StatusConfig[] = [
  {
    key: "waiting",
    label: "Aguardando",
    icon: Package,
    color: "text-slate-600",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    headerBg: "bg-slate-100",
    badgeBg: "bg-slate-200 text-slate-700",
  },
  {
    key: "in_production",
    label: "Em Produção",
    icon: Wrench,
    color: "text-amber-600",
    bgColor: "bg-amber-50/50",
    borderColor: "border-amber-200",
    headerBg: "bg-amber-100/60",
    badgeBg: "bg-amber-200 text-amber-800",
  },
  {
    key: "review",
    label: "Revisão",
    icon: Eye,
    color: "text-blue-600",
    bgColor: "bg-blue-50/50",
    borderColor: "border-blue-200",
    headerBg: "bg-blue-100/60",
    badgeBg: "bg-blue-200 text-blue-800",
  },
  {
    key: "ready",
    label: "Pronto",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50/50",
    borderColor: "border-emerald-200",
    headerBg: "bg-emerald-100/60",
    badgeBg: "bg-emerald-200 text-emerald-800",
  },
  {
    key: "delivered",
    label: "Entregue",
    icon: Truck,
    color: "text-sage",
    bgColor: "bg-sage-light/30",
    borderColor: "border-sage/30",
    headerBg: "bg-sage-light/50",
    badgeBg: "bg-sage-light text-sage",
  },
];

const STATUS_LABELS: Record<string, string> = {
  waiting: "Aguardando",
  in_production: "Em Produção",
  review: "Revisão",
  ready: "Pronto",
  delivered: "Entregue",
};

// ─── Deadline Helpers ──────────────────────────────────────
function daysUntilDeadline(deadline: Date | string): number {
  const d = new Date(deadline);
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getDeadlineIndicator(deadline: Date | string, status: string) {
  if (status === "delivered") return { color: "text-sage", bg: "bg-sage-light/50", label: "Entregue" };
  const days = daysUntilDeadline(deadline);
  if (days < 0) return { color: "text-danger", bg: "bg-danger-light", label: `${Math.abs(days)}d atrasado` };
  if (days === 0) return { color: "text-amber-600", bg: "bg-amber-100", label: "Hoje" };
  if (days === 1) return { color: "text-amber-600", bg: "bg-amber-100", label: "Amanhã" };
  if (days <= 3) return { color: "text-amber-600", bg: "bg-amber-50", label: `${days} dias` };
  return { color: "text-muted-foreground", bg: "bg-muted/50", label: `${days} dias` };
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

// ─── Job History Dialog ────────────────────────────────────
function JobHistoryDialog({
  job,
  open,
  onClose,
  users,
  onAssign,
}: {
  job: any;
  open: boolean;
  onClose: () => void;
  users: any[];
  onAssign: (userId: number | null) => void;
}) {
  const { data: history, isLoading } = trpc.kanban.getJobHistory.useQuery(
    { jobId: job?.id },
    { enabled: open && !!job?.id }
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-base flex items-center gap-2">
            <History size={16} className="text-primary" />
            {job?.code} — {job?.serviceName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="history">
          <TabsList className="w-full">
            <TabsTrigger value="history" className="flex-1 text-xs">
              Histórico
            </TabsTrigger>
            <TabsTrigger value="assign" className="flex-1 text-xs">
              Responsável
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-3">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            ) : !history || history.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <History size={32} className="mb-2 opacity-30" />
                <p className="text-sm font-body">Nenhuma movimentação registrada</p>
              </div>
            ) : (
              <ScrollArea className="h-[280px] pr-2">
                <div className="relative pl-4">
                  {/* Timeline line */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/60" />

                  <div className="space-y-3">
                    {history.map((log: any, idx: number) => (
                      <div key={log.id} className="relative flex gap-3">
                        {/* Dot */}
                        <div className={`
                          absolute -left-[1px] top-1.5 w-3 h-3 rounded-full border-2 border-background
                          ${idx === 0 ? "bg-primary" : "bg-muted-foreground/40"}
                        `} />

                        <div className="pl-4 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {log.fromStatusLabel && (
                              <>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                  {log.fromStatusLabel}
                                </Badge>
                                <ArrowRight size={10} className="text-muted-foreground" />
                              </>
                            )}
                            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-0">
                              {log.toStatusLabel}
                            </Badge>
                          </div>
                          {log.notes && (
                            <p className="text-xs font-body text-muted-foreground mt-0.5 italic">
                              {log.notes}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1">
                            <User size={10} className="text-muted-foreground/60" />
                            <span className="text-[10px] font-body text-muted-foreground/70">
                              {log.userName ?? "Sistema"}
                            </span>
                            <span className="text-[10px] text-muted-foreground/40">·</span>
                            <span className="text-[10px] font-body text-muted-foreground/50">
                              {new Date(log.createdAt).toLocaleString("pt-BR", {
                                day: "2-digit", month: "2-digit",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="assign" className="mt-3">
            <div className="space-y-2">
              <p className="text-xs font-body text-muted-foreground mb-3">
                Selecione o responsável pela execução deste trabalho:
              </p>
              <div
                onClick={() => onAssign(null)}
                className={`
                  flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                  ${!job?.assignedTo ? "border-primary/40 bg-primary/5" : "border-border/40 hover:border-border"}
                `}
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs bg-muted">—</AvatarFallback>
                </Avatar>
                <span className="text-sm font-body">Sem responsável</span>
                {!job?.assignedTo && <CheckCircle2 size={14} className="text-primary ml-auto" />}
              </div>
              {users.map((u: any) => (
                <div
                  key={u.id}
                  onClick={() => onAssign(u.id)}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                    ${job?.assignedTo === u.id ? "border-primary/40 bg-primary/5" : "border-border/40 hover:border-border"}
                  `}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body font-medium truncate">{u.name}</p>
                    <p className="text-[10px] font-body text-muted-foreground">{u.role === "admin" ? "Administrador" : "Colaborador"}</p>
                  </div>
                  {job?.assignedTo === u.id && <CheckCircle2 size={14} className="text-primary" />}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Metrics Widget ────────────────────────────────────────
function MetricsWidget({ onClose }: { onClose: () => void }) {
  const { data: metrics, isLoading } = trpc.kanban.getMetrics.useQuery();

  const statusOrder = ["waiting", "in_production", "review", "ready"];
  const maxSecs = metrics
    ? Math.max(...statusOrder.map(s => metrics.avgTimePerStatus[s] ?? 0), 1)
    : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <BarChart2 size={15} className="text-primary" />
            Métricas de Produção
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X size={12} />
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin text-primary" size={20} />
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* KPIs */}
              <div className="col-span-2 lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-2 mb-1">
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-2.5">
                  <p className="text-[10px] font-body text-muted-foreground mb-0.5">Ativos</p>
                  <p className="text-xl font-heading font-bold text-foreground">{metrics?.totalActive ?? 0}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2.5">
                  <p className="text-[10px] font-body text-muted-foreground mb-0.5">Entregues (mês)</p>
                  <p className="text-xl font-heading font-bold text-emerald-700">{metrics?.deliveredThisMonth ?? 0}</p>
                </div>
                <div className="rounded-xl bg-danger-light/50 border border-danger/10 p-2.5">
                  <p className="text-[10px] font-body text-muted-foreground mb-0.5">Atrasados</p>
                  <p className="text-xl font-heading font-bold text-danger">{metrics?.overdueCount ?? 0}</p>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-2.5">
                  <p className="text-[10px] font-body text-muted-foreground mb-0.5">Gargalo</p>
                  <p className="text-sm font-heading font-bold text-amber-700 truncate">
                    {metrics?.bottleneckLabel ?? "—"}
                  </p>
                </div>
              </div>

              {/* Avg time per status */}
              <div className="col-span-2 lg:col-span-4">
                <p className="text-[10px] font-body text-muted-foreground mb-2 uppercase tracking-wide">
                  Tempo médio por etapa
                </p>
                <div className="space-y-2">
                  {statusOrder.map(status => {
                    const secs = metrics?.avgTimePerStatus[status] ?? 0;
                    const formatted = metrics?.avgTimeFormatted[status] ?? "—";
                    const pct = maxSecs > 0 ? (secs / maxSecs) * 100 : 0;
                    const isBottleneck = metrics?.bottleneck === status;
                    const cfg = STATUS_CONFIG.find(c => c.key === status);
                    return (
                      <div key={status} className="flex items-center gap-2">
                        <span className="text-[10px] font-body text-muted-foreground w-24 shrink-0">
                          {STATUS_LABELS[status]}
                        </span>
                        <div className="flex-1 h-2 bg-muted/60 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${isBottleneck ? "bg-amber-400" : "bg-primary/40"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-body font-semibold w-10 text-right ${isBottleneck ? "text-amber-600" : "text-muted-foreground"}`}>
                          {formatted}
                        </span>
                        {isBottleneck && secs > 0 && (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle size={10} className="text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Gargalo identificado</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Draggable Job Card ────────────────────────────────────
function JobCard({
  job,
  isDragging,
  onOpenHistory,
}: {
  job: any;
  isDragging?: boolean;
  onOpenHistory?: (job: any) => void;
}) {
  const deadlineInfo = getDeadlineIndicator(job.deadline, job.status);
  const isOverdue = daysUntilDeadline(job.deadline) < 0 && job.status !== "delivered";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isCardDragging,
  } = useDraggable({
    id: `job-${job.id}`,
    data: { job },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isCardDragging ? 50 : undefined,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative rounded-xl border bg-card p-3 transition-all duration-200
        ${isCardDragging ? "opacity-40 shadow-none" : "shadow-sm hover:shadow-md"}
        ${isOverdue ? "border-danger/40 ring-1 ring-danger/20" : "border-border/60"}
        ${isDragging ? "shadow-xl ring-2 ring-primary/30 rotate-2" : ""}
      `}
    >
      {/* Drag handle */}
      <div
        {...listeners}
        {...attributes}
        className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing hover:bg-muted/50"
      >
        <GripVertical size={14} className="text-muted-foreground" />
      </div>

      {/* Header: Code + OS */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-heading font-bold text-foreground">
          {job.code}
        </span>
        {job.orderNumber && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono">
            OS {job.orderNumber}
          </Badge>
        )}
      </div>

      {/* Service Name */}
      <p className="text-sm font-body font-medium text-foreground leading-snug mb-1.5 pr-6 line-clamp-2">
        {job.serviceName}
      </p>

      {/* Client */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <User size={12} className="text-muted-foreground shrink-0" />
        <span className="text-xs font-body text-muted-foreground truncate">
          {job.clientName || "Sem cliente"}
        </span>
      </div>

      {/* Patient (if exists) */}
      {job.patientName && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <User size={12} className="text-primary/60 shrink-0" />
          <span className="text-xs font-body text-primary/70 truncate">
            Pac: {job.patientName}
          </span>
        </div>
      )}

      {/* Assigned To */}
      {job.assignedToName && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <Avatar className="w-4 h-4">
            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
              {getInitials(job.assignedToName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-[10px] font-body text-primary/80 truncate font-medium">
            {job.assignedToName}
          </span>
        </div>
      )}

      {/* Footer: Deadline + Price + History button */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-body font-semibold ${deadlineInfo.bg} ${deadlineInfo.color}`}>
              {isOverdue ? <AlertTriangle size={10} /> : <Clock size={10} />}
              {deadlineInfo.label}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              Prazo: {new Date(job.deadline).toLocaleDateString("pt-BR")}
            </p>
          </TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-1">
          <span className="text-[10px] font-body font-semibold text-muted-foreground">
            R$ {parseFloat(job.price || "0").toFixed(2)}
          </span>
          {onOpenHistory && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenHistory(job); }}
                  className="p-1 rounded-md hover:bg-muted/60 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <History size={11} className="text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Ver histórico</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Overlay Card (shown while dragging) ───────────────────
function DragOverlayCard({ job }: { job: any }) {
  const deadlineInfo = getDeadlineIndicator(job.deadline, job.status);
  const isOverdue = daysUntilDeadline(job.deadline) < 0 && job.status !== "delivered";

  return (
    <div className="w-[280px] rounded-xl border border-primary/30 bg-card p-3 shadow-2xl ring-2 ring-primary/20 rotate-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-heading font-bold text-foreground">{job.code}</span>
        {job.orderNumber && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono">
            OS {job.orderNumber}
          </Badge>
        )}
      </div>
      <p className="text-sm font-body font-medium text-foreground leading-snug mb-1.5 line-clamp-2">
        {job.serviceName}
      </p>
      <div className="flex items-center gap-1.5 mb-2">
        <User size={12} className="text-muted-foreground" />
        <span className="text-xs font-body text-muted-foreground truncate">{job.clientName}</span>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-body font-semibold ${deadlineInfo.bg} ${deadlineInfo.color}`}>
          {isOverdue ? <AlertTriangle size={10} /> : <Clock size={10} />}
          {deadlineInfo.label}
        </div>
        <span className="text-[10px] font-body font-semibold text-muted-foreground">
          R$ {parseFloat(job.price || "0").toFixed(2)}
        </span>
      </div>
    </div>
  );
}

// ─── Droppable Column ──────────────────────────────────────
function KanbanColumn({
  config,
  jobs,
  isOver,
  onOpenHistory,
}: {
  config: StatusConfig;
  jobs: any[];
  isOver: boolean;
  onOpenHistory: (job: any) => void;
}) {
  const { setNodeRef, isOver: isColumnOver } = useDroppable({
    id: `column-${config.key}`,
    data: { status: config.key },
  });

  const Icon = config.icon;
  const active = isOver || isColumnOver;

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col min-w-[280px] max-w-[320px] w-full rounded-2xl border transition-all duration-300
        ${active ? `${config.borderColor} ring-2 ring-primary/20 scale-[1.01]` : "border-border/40"}
        ${config.bgColor}
      `}
    >
      {/* Column Header */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-t-2xl ${config.headerBg}`}>
        <div className="flex items-center gap-2">
          <Icon size={16} className={config.color} strokeWidth={2} />
          <h3 className={`text-sm font-heading font-bold ${config.color}`}>
            {config.label}
          </h3>
        </div>
        <Badge className={`${config.badgeBg} text-[10px] font-bold px-2 py-0 h-5 border-0`}>
          {jobs.length}
        </Badge>
      </div>

      {/* Cards Container */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[120px]">
        {jobs.length === 0 ? (
          <div className={`
            flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed transition-all
            ${active ? "border-primary/40 bg-primary/5" : "border-border/30"}
          `}>
            <Icon size={24} className="text-muted-foreground/30 mb-2" />
            <p className="text-xs font-body text-muted-foreground/50">
              {active ? "Solte aqui" : "Nenhum trabalho"}
            </p>
          </div>
        ) : (
          jobs.map((job: any) => (
            <JobCard key={job.id} job={job} onOpenHistory={onOpenHistory} />
          ))
        )}

        {/* Drop indicator when column has items */}
        {active && jobs.length > 0 && (
          <div className="flex items-center justify-center py-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5">
            <ArrowRight size={14} className="text-primary/50 mr-1" />
            <p className="text-xs font-body text-primary/60 font-medium">Solte aqui</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Kanban Page ──────────────────────────────────────
export default function Kanban() {
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [activeJob, setActiveJob] = useState<any>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [showMetrics, setShowMetrics] = useState(false);
  const [historyJob, setHistoryJob] = useState<any>(null);

  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: clientsList } = trpc.clients.list.useQuery();
  const { data: boardData, isLoading } = trpc.kanban.getBoard.useQuery(
    {
      search: search || undefined,
      clientId: clientFilter !== "all" ? Number(clientFilter) : undefined,
      assignedTo: assignedFilter !== "all" ? Number(assignedFilter) : undefined,
    },
    { refetchInterval: 30000 }
  );

  const moveMutation = trpc.kanban.moveJob.useMutation({
    onSuccess: (result) => {
      utils.kanban.getBoard.invalidate();
      utils.jobs.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.notifications.list.invalidate();
      toast.success("Trabalho movido", {
        description: `Movido para "${STATUS_LABELS[result.newStatus]}"`,
      });
    },
    onError: (err) => {
      toast.error("Erro ao mover", { description: err.message });
      utils.kanban.getBoard.invalidate();
    },
  });

  const assignMutation = trpc.kanban.assignJob.useMutation({
    onSuccess: () => {
      utils.kanban.getBoard.invalidate();
      toast.success("Responsável atualizado");
      setHistoryJob(null);
    },
    onError: (err) => {
      toast.error("Erro ao atribuir", { description: err.message });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const job = event.active.data.current?.job;
    if (job) setActiveJob(job);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverColumnId(event.over ? String(event.over.id) : null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveJob(null);
    setOverColumnId(null);
    if (!over) return;

    const job = active.data.current?.job;
    if (!job) return;

    const newStatus = String(over.id).replace("column-", "");
    if (job.status === newStatus) return;

    const validStatuses = ["waiting", "in_production", "review", "ready", "delivered"];
    if (!validStatuses.includes(newStatus)) return;

    moveMutation.mutate({ jobId: job.id, newStatus: newStatus as any });
  }, [moveMutation]);

  const handleDragCancel = useCallback(() => {
    setActiveJob(null);
    setOverColumnId(null);
  }, []);

  const columns = boardData?.columns ?? {};
  const users = boardData?.users ?? [];
  const clients = clientsList ?? [];

  const totalJobs = boardData?.totalCount ?? 0;
  const overdueCount = useMemo(() => {
    let count = 0;
    for (const status of Object.keys(columns)) {
      if (status === "delivered") continue;
      for (const job of columns[status] || []) {
        if (daysUntilDeadline(job.deadline) < 0) count++;
      }
    }
    return count;
  }, [columns]);

  return (
    <motion.div
      variants={{ animate: { transition: { staggerChildren: 0.06 } } }}
      initial="initial"
      animate="animate"
      className="space-y-4"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Kanban de Produção
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Arraste os trabalhos entre as colunas para atualizar o status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-body px-3 py-1">
            {totalJobs} trabalho{totalJobs !== 1 ? "s" : ""}
          </Badge>
          {overdueCount > 0 && (
            <Badge className="bg-danger-light text-danger text-xs font-body px-3 py-1 border-0">
              <AlertTriangle size={12} className="mr-1" />
              {overdueCount} atrasado{overdueCount !== 1 ? "s" : ""}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-body gap-1.5"
            onClick={() => setShowMetrics(v => !v)}
          >
            <BarChart2 size={13} />
            Métricas
          </Button>
        </div>
      </motion.div>

      {/* Metrics Widget */}
      <AnimatePresence>
        {showMetrics && (
          <MetricsWidget onClose={() => setShowMetrics(false)} />
        )}
      </AnimatePresence>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border border-border/60 shadow-sm">
          <div className="p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por código, OS, serviço..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-4 rounded-xl bg-muted/50 border-0 text-sm font-body placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-muted-foreground shrink-0" />
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-[180px] h-9 text-xs font-body">
                  <SelectValue placeholder="Filtrar por cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                <SelectTrigger className="w-[160px] h-9 text-xs font-body">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      )}

      {/* Kanban Board */}
      {!isLoading && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x snap-mandatory">
              {STATUS_CONFIG.map((config) => (
                <KanbanColumn
                  key={config.key}
                  config={config}
                  jobs={columns[config.key] || []}
                  isOver={overColumnId === `column-${config.key}`}
                  onOpenHistory={setHistoryJob}
                />
              ))}
            </div>

            <DragOverlay dropAnimation={null}>
              {activeJob ? <DragOverlayCard job={activeJob} /> : null}
            </DragOverlay>
          </DndContext>
        </motion.div>
      )}

      {/* Empty state */}
      {!isLoading && totalJobs === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-muted-foreground"
        >
          <Package size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-heading font-semibold mb-2">
            Nenhum trabalho no quadro
          </p>
          <p className="text-sm font-body mb-4">
            Crie trabalhos na página de Trabalhos para visualizá-los aqui.
          </p>
        </motion.div>
      )}

      {/* Job History & Assignment Dialog */}
      {historyJob && (
        <JobHistoryDialog
          job={historyJob}
          open={!!historyJob}
          onClose={() => setHistoryJob(null)}
          users={users}
          onAssign={(userId) => {
            assignMutation.mutate({ jobId: historyJob.id, assignedTo: userId });
          }}
        />
      )}
    </motion.div>
  );
}
