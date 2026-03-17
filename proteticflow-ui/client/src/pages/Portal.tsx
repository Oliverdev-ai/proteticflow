/**
 * Portal.tsx — Página pública do Portal do Cliente
 *
 * Acessível via /portal/:token sem necessidade de login.
 * Design profissional voltado para o cliente final (dentista/clínica).
 * Exibe OS em tempo real com timeline de movimentações.
 */

import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  CheckCircle2,
  Package,
  Microscope,
  Truck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  Hash,
  Phone,
  Mail,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

// ─── Status Config ───────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode; step: number }
> = {
  waiting: {
    label: "Aguardando",
    color: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-300",
    icon: <Clock className="w-4 h-4" />,
    step: 1,
  },
  in_production: {
    label: "Em Produção",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-300",
    icon: <Microscope className="w-4 h-4" />,
    step: 2,
  },
  review: {
    label: "Revisão",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-300",
    icon: <Package className="w-4 h-4" />,
    step: 3,
  },
  ready: {
    label: "Pronto",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    icon: <CheckCircle2 className="w-4 h-4" />,
    step: 4,
  },
  delivered: {
    label: "Entregue",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-300",
    icon: <Truck className="w-4 h-4" />,
    step: 5,
  },
  overdue: {
    label: "Atrasado",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-300",
    icon: <AlertTriangle className="w-4 h-4" />,
    step: 0,
  },
};

const STEPS = ["waiting", "in_production", "review", "ready", "delivered"];

// ─── Progress Bar ────────────────────────────────────────────

function StatusProgressBar({ status }: { status: string }) {
  const currentStep = STATUS_CONFIG[status]?.step ?? 0;
  if (status === "overdue") {
    return (
      <div className="flex items-center gap-2 mt-3">
        <AlertTriangle className="w-4 h-4 text-red-500" />
        <span className="text-sm text-red-600 font-medium">Trabalho com prazo vencido</span>
      </div>
    );
  }
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        {STEPS.map((step, idx) => {
          const cfg = STATUS_CONFIG[step];
          const isActive = idx + 1 === currentStep;
          const isDone = idx + 1 < currentStep;
          return (
            <div key={step} className="flex flex-col items-center flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                  ${isDone ? "bg-emerald-500 border-emerald-500 text-white" : ""}
                  ${isActive ? "bg-blue-600 border-blue-600 text-white scale-110 shadow-md" : ""}
                  ${!isDone && !isActive ? "bg-white border-slate-300 text-slate-400" : ""}
                `}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : cfg.icon}
              </div>
              <span
                className={`text-[10px] mt-1 font-medium text-center leading-tight
                  ${isActive ? "text-blue-700" : isDone ? "text-emerald-600" : "text-slate-400"}
                `}
              >
                {cfg.label}
              </span>
              {idx < STEPS.length - 1 && (
                <div
                  className={`absolute hidden`}
                />
              )}
            </div>
          );
        })}
      </div>
      {/* Linha de progresso */}
      <div className="relative h-1.5 bg-slate-200 rounded-full mt-1 mx-3">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${Math.max(0, ((currentStep - 1) / (STEPS.length - 1)) * 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Job Card ────────────────────────────────────────────────

interface JobLog {
  id: number;
  fromStatus: string | null;
  toStatus: string;
  notes: string | null;
  userName: string | null;
  createdAt: Date;
}

interface PortalJob {
  id: number;
  code: string;
  orderNumber: number | null;
  serviceName: string;
  patientName: string | null;
  tooth: string | null;
  status: string;
  progress: number;
  deadline: Date;
  deliveredAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  logs: JobLog[];
}

function JobCard({ job }: { job: PortalJob }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.waiting;
  const isOverdue = new Date() > new Date(job.deadline) && job.status !== "delivered";
  const daysUntilDeadline = Math.ceil(
    (new Date(job.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card
      className={`border ${cfg.border} transition-shadow hover:shadow-md`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-800 text-base">{job.serviceName}</span>
              {job.orderNumber && (
                <Badge variant="outline" className="text-xs font-mono">
                  <Hash className="w-3 h-3 mr-1" />
                  OS {job.orderNumber}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs font-mono text-slate-500">
                {job.code}
              </Badge>
            </div>
            {job.patientName && (
              <div className="flex items-center gap-1 mt-1 text-sm text-slate-500">
                <User className="w-3.5 h-3.5" />
                <span>Paciente: {job.patientName}</span>
                {job.tooth && <span className="text-slate-400">· Dente: {job.tooth}</span>}
              </div>
            )}
          </div>
          <Badge
            className={`${cfg.bg} ${cfg.color} ${cfg.border} border font-medium text-xs shrink-0`}
          >
            <span className="mr-1">{cfg.icon}</span>
            {cfg.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Progress bar */}
        <StatusProgressBar status={job.status} />

        {/* Prazo */}
        <div className="flex items-center gap-4 mt-4 text-sm">
          <div className={`flex items-center gap-1.5 ${isOverdue ? "text-red-600 font-semibold" : daysUntilDeadline <= 1 ? "text-amber-600 font-semibold" : "text-slate-500"}`}>
            <Calendar className="w-4 h-4" />
            <span>
              Prazo: {new Date(job.deadline).toLocaleDateString("pt-BR")}
              {job.status !== "delivered" && (
                <span className="ml-1 text-xs">
                  {isOverdue
                    ? `(${Math.abs(daysUntilDeadline)}d atrasado)`
                    : daysUntilDeadline === 0
                    ? "(hoje)"
                    : daysUntilDeadline === 1
                    ? "(amanhã)"
                    : `(em ${daysUntilDeadline}d)`}
                </span>
              )}
            </span>
          </div>
          {job.deliveredAt && (
            <div className="flex items-center gap-1.5 text-emerald-600">
              <Truck className="w-4 h-4" />
              <span>Entregue em {new Date(job.deliveredAt).toLocaleDateString("pt-BR")}</span>
            </div>
          )}
        </div>

        {/* Notas */}
        {job.notes && (
          <p className="mt-3 text-sm text-slate-500 italic bg-slate-50 rounded-md px-3 py-2 border border-slate-200">
            {job.notes}
          </p>
        )}

        {/* Timeline de movimentações */}
        {job.logs.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expanded ? "Ocultar histórico" : `Ver histórico (${job.logs.length} movimentações)`}
            </button>

            {expanded && (
              <div className="mt-3 space-y-2">
                {job.logs.map((log, idx) => {
                  const fromCfg = log.fromStatus ? STATUS_CONFIG[log.fromStatus] : null;
                  const toCfg = STATUS_CONFIG[log.toStatus];
                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 text-sm"
                    >
                      <div className="flex flex-col items-center">
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${toCfg?.bg ?? "bg-slate-200"} border ${toCfg?.border ?? "border-slate-300"}`} />
                        {idx < job.logs.length - 1 && (
                          <div className="w-px h-full bg-slate-200 mt-1 min-h-[16px]" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {fromCfg && (
                            <>
                              <span className={`text-xs font-medium ${fromCfg.color}`}>
                                {fromCfg.label}
                              </span>
                              <span className="text-slate-400">→</span>
                            </>
                          )}
                          <span className={`text-xs font-semibold ${toCfg?.color ?? "text-slate-600"}`}>
                            {toCfg?.label ?? log.toStatus}
                          </span>
                          <span className="text-slate-400 text-xs ml-auto">
                            {new Date(log.createdAt).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {log.notes && (
                          <p className="text-slate-500 text-xs mt-0.5 italic">{log.notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Summary Cards ───────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`rounded-xl p-4 ${color} flex items-center gap-3`}>
      <div className="opacity-80">{icon}</div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs mt-1 opacity-75 font-medium">{label}</p>
      </div>
    </div>
  );
}

// ─── Página Principal ────────────────────────────────────────

export default function Portal() {
  const { token } = useParams<{ token: string }>();
  const [filter, setFilter] = useState<string>("all");

  const { data, isLoading, error, refetch, isFetching } = trpc.portal.getData.useQuery(
    { token: token ?? "" },
    {
      enabled: !!token,
      refetchInterval: 60_000, // Atualiza a cada 1 minuto
      retry: false,
    }
  );

  // ─── Loading ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Carregando portal...</p>
        </div>
      </div>
    );
  }

  // ─── Erro / Token inválido ────────────────────────────────
  if (error || !data) {
    const message = error?.message ?? "Token inválido ou expirado";
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 shadow-lg">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-800 mb-2">Acesso não autorizado</h1>
            <p className="text-slate-500 text-sm mb-6">{message}</p>
            <p className="text-xs text-slate-400">
              Este link pode ter expirado ou sido revogado. Entre em contato com o laboratório para obter um novo link de acesso.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { client, lab, jobs: allJobs, summary, tokenInfo } = data;
  const primaryColor = lab.primaryColor ?? "#1a56db";

  // Filtrar trabalhos
  const filteredJobs = filter === "all"
    ? allJobs
    : allJobs.filter((j) => j.status === filter);

  const activeJobs = allJobs.filter((j) => j.status !== "delivered");
  const daysUntilExpiry = Math.ceil(
    (new Date(tokenInfo.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header
        className="text-white shadow-lg"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
      >
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {lab.logoUrl && (
                <img
                  src={lab.logoUrl}
                  alt={lab.labName}
                  className="h-12 w-12 rounded-lg object-cover bg-white/20 p-1"
                />
              )}
              <div>
                <h1 className="text-xl font-bold">{lab.labName}</h1>
                <p className="text-white/80 text-sm">Portal do Cliente</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Info do cliente */}
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{client.name}</h2>
                {client.clinic && (
                  <p className="text-slate-500 text-sm">{client.clinic}</p>
                )}
                {(client.city || client.state) && (
                  <p className="text-slate-400 text-xs mt-0.5">
                    {[client.city, client.state].filter(Boolean).join(" — ")}
                  </p>
                )}
              </div>
              <div className="text-right text-xs text-slate-400 space-y-1">
                {tokenInfo.label && (
                  <p className="font-medium text-slate-500">{tokenInfo.label}</p>
                )}
                <p>Acesso válido até {new Date(tokenInfo.expiresAt).toLocaleDateString("pt-BR")}</p>
                {daysUntilExpiry <= 14 && (
                  <p className="text-amber-600 font-medium">
                    ⚠️ Expira em {daysUntilExpiry} dias
                  </p>
                )}
                <p className="text-slate-300">{tokenInfo.accessCount} acessos registrados</p>
              </div>
            </div>

            {/* Contato do lab */}
            {(lab.phone || lab.email) && (
              <>
                <Separator className="my-4" />
                <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                  {lab.phone && (
                    <a href={`tel:${lab.phone}`} className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                      <Phone className="w-4 h-4" />
                      {lab.phone}
                    </a>
                  )}
                  {lab.email && (
                    <a href={`mailto:${lab.email}`} className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                      <Mail className="w-4 h-4" />
                      {lab.email}
                    </a>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            label="Em andamento"
            value={activeJobs.length}
            icon={<Microscope className="w-6 h-6 text-blue-700" />}
            color="bg-blue-50 text-blue-800"
          />
          <SummaryCard
            label="Prontos"
            value={summary.ready}
            icon={<CheckCircle2 className="w-6 h-6 text-emerald-700" />}
            color="bg-emerald-50 text-emerald-800"
          />
          <SummaryCard
            label="Entregues"
            value={summary.delivered}
            icon={<Truck className="w-6 h-6 text-green-700" />}
            color="bg-green-50 text-green-800"
          />
          <SummaryCard
            label="Atrasados"
            value={summary.overdue}
            icon={<AlertTriangle className="w-6 h-6 text-red-700" />}
            color={summary.overdue > 0 ? "bg-red-50 text-red-800" : "bg-slate-100 text-slate-500"}
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: "all", label: `Todos (${summary.total})` },
            { value: "waiting", label: `Aguardando (${summary.waiting})` },
            { value: "in_production", label: `Em Produção (${summary.inProduction})` },
            { value: "review", label: `Revisão (${summary.review})` },
            { value: "ready", label: `Pronto (${summary.ready})` },
            { value: "delivered", label: `Entregue (${summary.delivered})` },
          ]
            .filter((f) => f.value === "all" || parseInt(f.label.match(/\d+/)?.[0] ?? "0") > 0)
            .map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                  ${filter === f.value
                    ? "text-white border-transparent shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                style={filter === f.value ? { background: primaryColor } : {}}
              >
                {f.label}
              </button>
            ))}
        </div>

        {/* Lista de trabalhos */}
        {filteredJobs.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200">
            <CardContent className="py-12 text-center">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Nenhum trabalho encontrado</p>
              <p className="text-slate-400 text-sm mt-1">
                {filter === "all"
                  ? "Não há trabalhos registrados nos últimos 6 meses."
                  : "Nenhum trabalho com este status no momento."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job as PortalJob} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 py-4 border-t border-slate-100">
          <p>
            Portal do Cliente — {lab.labName}
            {lab.email && (
              <>
                {" · "}
                <a href={`mailto:${lab.email}`} className="hover:text-blue-500 transition-colors">
                  {lab.email}
                </a>
              </>
            )}
          </p>
          <p className="mt-1">Atualizado automaticamente a cada minuto</p>
        </div>
      </main>
    </div>
  );
}
