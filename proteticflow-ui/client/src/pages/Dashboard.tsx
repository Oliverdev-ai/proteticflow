/**
 * Dashboard — ProteticFlow "Atelier Digital"
 * KPIs com ícones pastel, gráficos Recharts, entregas do dia, alertas
 * RBAC: Colaborador não vê dados financeiros (faturamento, receita vs custos)
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Briefcase, Users, Clock, TrendingUp, AlertTriangle,
  CheckCircle2, ArrowUpRight, CalendarDays, Package, Bell, Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};
const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

/* ── Static chart data (will be replaced when analytics API is ready) ── */
const monthlyData = [
  { month: "Set", receita: 28500, custos: 18200 },
  { month: "Out", receita: 32100, custos: 19800 },
  { month: "Nov", receita: 29800, custos: 17500 },
  { month: "Dez", receita: 38200, custos: 22100 },
  { month: "Jan", receita: 35600, custos: 20400 },
  { month: "Fev", receita: 42500, custos: 23800 },
];

const serviceDistribution = [
  { name: "Coroas", value: 35, color: "#d97706" },
  { name: "Próteses", value: 25, color: "#6b8f71" },
  { name: "Facetas", value: 20, color: "#3b82f6" },
  { name: "Implantes", value: 12, color: "#f59e0b" },
  { name: "Outros", value: 8, color: "#94a3b8" },
];

const weeklyJobs = [
  { day: "Seg", concluidos: 5, novos: 3 },
  { day: "Ter", concluidos: 7, novos: 4 },
  { day: "Qua", concluidos: 4, novos: 6 },
  { day: "Qui", concluidos: 8, novos: 5 },
  { day: "Sex", concluidos: 6, novos: 7 },
  { day: "Sáb", concluidos: 3, novos: 2 },
];

const statusMap: Record<string, { label: string; className: string }> = {
  waiting: { label: "Aguardando", className: "bg-muted text-muted-foreground" },
  in_production: { label: "Em Produção", className: "bg-warning-light text-warning" },
  review: { label: "Revisão", className: "bg-primary/10 text-primary" },
  ready: { label: "Pronto", className: "bg-success-light text-success" },
  delivered: { label: "Entregue", className: "bg-success-light text-success" },
  overdue: { label: "Atrasado", className: "bg-danger-light text-danger" },
};

function formatCurrency(value: string | number) {
  if (value === "***") return "***";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "R$ 0";
  if (num >= 1000) return `R$ ${(num / 1000).toFixed(1)}k`;
  return `R$ ${num.toFixed(0)}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const heroUrl = "https://d2xsxph8kpxj0f.cloudfront.net/310419663031704091/e5qym9UxhBWYiSZbfAJzwi/proteticflow-dashboard-hero-XMnxz95TPXYuhxixy4sNS4.webp";

  // Real data from backend
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: jobsList } = trpc.jobs.list.useQuery();
  const { data: notifCount } = trpc.notifications.unreadCount.useQuery();

  const todayDeliveries = useMemo(() => {
    if (!jobsList) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return jobsList
      .filter(j => {
        const d = new Date(j.deadline);
        return d >= today && d < tomorrow;
      })
      .slice(0, 8);
  }, [jobsList]);

  const overdueJobs = useMemo(() => {
    if (!jobsList) return [];
    return jobsList.filter(j => j.status === "overdue").slice(0, 5);
  }, [jobsList]);

  // KPIs — financeiro só para admin
  const kpis = useMemo(() => {
    const items = [
      {
        label: "Trabalhos Ativos",
        value: stats ? String(stats.totalJobs) : "—",
        change: stats?.overdueJobs ? `${stats.overdueJobs} atrasados` : "0 atrasados",
        positive: !stats?.overdueJobs,
        icon: Briefcase,
        color: "bg-amber-light text-amber",
      },
      {
        label: "Clientes Ativos",
        value: stats ? String(stats.totalClients) : "—",
        change: "",
        positive: true,
        icon: Users,
        color: "bg-sage-light text-sage",
      },
      {
        label: "Entregas Hoje",
        value: stats ? String(stats.todayDeliveries) : "—",
        change: overdueJobs.length ? `${overdueJobs.length} urgentes` : "Tudo em dia",
        positive: !overdueJobs.length,
        icon: Clock,
        color: "bg-warning-light text-warning",
      },
    ];

    // Faturamento só para admin
    if (isAdmin) {
      items.push({
        label: "Faturamento Mensal",
        value: stats ? formatCurrency(stats.monthlyRevenue) : "—",
        change: "",
        positive: true,
        icon: TrendingUp,
        color: "bg-success-light text-success",
      });
    }

    return items;
  }, [stats, overdueJobs, isAdmin]);

  const userName = user?.name?.split(" ")[0] || "Usuário";

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6">
      {/* Welcome Banner */}
      <motion.div variants={fadeUp}>
        <Card className="overflow-hidden border-0 shadow-sm">
          <div className="relative h-40 sm:h-48 flex items-center">
            <img src={heroUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-sidebar/90 via-sidebar/70 to-transparent" />
            <div className="relative z-10 px-6 sm:px-8">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white mb-1">
                {getGreeting()}, {userName}
              </h1>
              <p className="text-white/70 text-sm sm:text-base font-body">
                Você tem <span className="text-amber font-semibold">{stats?.todayDeliveries ?? 0} entregas</span> programadas para hoje
                {stats?.overdueJobs ? (
                  <> e <span className="text-amber font-semibold">{stats.overdueJobs} trabalhos urgentes</span>.</>
                ) : "."}
              </p>
              {!isAdmin && (
                <p className="text-white/40 text-xs font-body mt-2 flex items-center gap-1">
                  <Lock size={10} /> Acesso de Colaborador
                </p>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* KPI Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? "xl:grid-cols-4" : "xl:grid-cols-3"} gap-4`}>
        {kpis.map((kpi) => (
          <motion.div key={kpi.label} variants={fadeUp}>
            <Card className="border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-body">{kpi.label}</p>
                    <p className="text-2xl font-heading font-bold mt-1 text-foreground">
                      {statsLoading ? (
                        <span className="inline-block w-16 h-7 bg-muted animate-pulse rounded" />
                      ) : kpi.value}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.color}`}>
                    <kpi.icon size={20} strokeWidth={1.5} />
                  </div>
                </div>
                {kpi.change && (
                  <div className="flex items-center gap-1 mt-3">
                    {kpi.positive ? (
                      <ArrowUpRight size={14} className="text-success" />
                    ) : (
                      <AlertTriangle size={14} className="text-warning" />
                    )}
                    <span className={`text-xs font-medium ${kpi.positive ? "text-success" : "text-warning"}`}>
                      {kpi.change}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row — Receita/Custos só para admin */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {isAdmin ? (
          <motion.div variants={fadeUp} className="lg:col-span-2">
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-heading font-semibold">Receita vs. Custos</CardTitle>
                  <Badge variant="secondary" className="text-xs font-body">Últimos 6 meses</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d97706" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#d97706" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradCustos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6b8f71" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#6b8f71" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontFamily: "Nunito Sans" }}
                      formatter={(value: number) => [`R$ ${(value / 1000).toFixed(1)}k`, ""]}
                    />
                    <Area type="monotone" dataKey="receita" stroke="#d97706" strokeWidth={2} fill="url(#gradReceita)" name="Receita" />
                    <Area type="monotone" dataKey="custos" stroke="#6b8f71" strokeWidth={2} fill="url(#gradCustos)" name="Custos" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* Colaborador: Trabalhos da Semana no lugar do gráfico financeiro */
          <motion.div variants={fadeUp} className="lg:col-span-2">
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-heading font-semibold">Trabalhos da Semana</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={weeklyJobs} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontFamily: "Nunito Sans" }} />
                    <Bar dataKey="concluidos" fill="#6b8f71" radius={[4, 4, 0, 0]} name="Concluídos" />
                    <Bar dataKey="novos" fill="#d97706" radius={[4, 4, 0, 0]} name="Novos" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={fadeUp}>
          <Card className="border border-border/60 shadow-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading font-semibold">Serviços</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={serviceDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {serviceDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontFamily: "Nunito Sans" }} formatter={(value: number) => [`${value}%`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-2 w-full">
                {serviceDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-muted-foreground font-body">{item.name}</span>
                    <span className="text-xs font-semibold text-foreground ml-auto">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Today's Deliveries */}
        <motion.div variants={fadeUp} className="lg:col-span-3">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays size={18} className="text-primary" />
                  <CardTitle className="text-base font-heading font-semibold">Entregas de Hoje</CardTitle>
                </div>
                <Badge className="bg-primary/10 text-primary border-0 text-xs font-body">
                  {todayDeliveries.length} entregas
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {todayDeliveries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle2 size={32} className="mb-2 text-success" />
                  <p className="text-sm font-body">Nenhuma entrega programada para hoje.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {todayDeliveries.map((delivery) => {
                    const status = statusMap[delivery.status] || statusMap.waiting;
                    return (
                      <div key={delivery.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors duration-150">
                        <div className="text-center shrink-0 w-12">
                          <p className="text-sm font-heading font-bold text-foreground">
                            {new Date(delivery.deadline).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{delivery.serviceName}</p>
                          <p className="text-xs text-muted-foreground truncate">{delivery.clientName || "Cliente"}</p>
                        </div>
                        <Badge className={`${status.className} border-0 text-xs font-medium shrink-0`}>
                          {status.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Alerts + Weekly Jobs (admin) or just Alerts (colaborador) */}
        <motion.div variants={fadeUp} className="lg:col-span-2 space-y-4">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-warning" />
                <CardTitle className="text-base font-heading font-semibold">Alertas</CardTitle>
                {(notifCount ?? 0) > 0 && (
                  <Badge className="bg-danger text-white border-0 text-xs ml-auto">{notifCount}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {overdueJobs.length > 0 ? (
                overdueJobs.map((job) => (
                  <div key={job.id} className="flex items-start gap-3 p-3 rounded-xl text-sm font-body bg-warning-light/50 text-warning">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span className="text-xs leading-relaxed">
                      {job.code}: {job.serviceName} — prazo vencido
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex items-start gap-3 p-3 rounded-xl text-sm font-body bg-success-light/50 text-success">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                  <span className="text-xs leading-relaxed">Tudo em dia! Nenhum trabalho atrasado.</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trabalhos da Semana — só para admin (colaborador já tem no topo) */}
          {isAdmin && (
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-heading font-semibold">Trabalhos da Semana</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={weeklyJobs} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontFamily: "Nunito Sans" }} />
                    <Bar dataKey="concluidos" fill="#6b8f71" radius={[4, 4, 0, 0]} name="Concluídos" />
                    <Bar dataKey="novos" fill="#d97706" radius={[4, 4, 0, 0]} name="Novos" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
