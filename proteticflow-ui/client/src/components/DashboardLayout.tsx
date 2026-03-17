/**
 * DashboardLayout — ProteticFlow "Atelier Digital" Design
 * Sidebar escura colapsável + conteúdo em off-white quente
 * RBAC: Sidebar condicional por role (admin vs colaborador)
 * Sino de notificações funcional com popover + dados reais via tRPC
 */
import { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, Briefcase, DollarSign, Settings,
  Bot, ChevronLeft, ChevronRight, LogOut, Bell, Search, Menu,
  Check, ShieldCheck, User as UserIcon, UserCog, Receipt, Columns3, Package, FileText,
  FileDown, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PushNotificationButton } from "@/components/PushNotificationButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

// ─── Navigation Items with role-based visibility ──────────
interface NavItem {
  path: string;
  icon: React.ComponentType<any>;
  label: string;
  adminOnly?: boolean;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/clientes", icon: Users, label: "Clientes" },
  { path: "/trabalhos", icon: Briefcase, label: "Trabalhos" },
  { path: "/kanban", icon: Columns3, label: "Kanban" },
  { path: "/estoque", icon: Package, label: "Estoque" },
  { path: "/relatorios", icon: FileText, label: "Relatórios" },
  { path: "/relatorios-pdf", icon: FileDown, label: "Relatórios PDF", adminOnly: true },
  { path: "/tabela-precos", icon: DollarSign, label: "Tabela de Preços", adminOnly: true },
  { path: "/financeiro", icon: Receipt, label: "Financeiro", adminOnly: true },
  { path: "/configuracoes", icon: Settings, label: "Configurações", adminOnly: true },
  { path: "/usuarios", icon: UserCog, label: "Gestão de Usuários", adminOnly: true },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === "admin";

  // Filter nav items based on role
  const navItems = useMemo(() => {
    return ALL_NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);
  }, [isAdmin]);

  // Notifications
  const { data: notifications } = trpc.notifications.list.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const utils = trpc.useUtils();
  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const unreadCount = notifications?.filter((n: any) => !n.isRead).length ?? 0;

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "PF";

  const displayName = user?.name?.split(" ")[0] ?? "Usuário";

  const roleBadge = isAdmin
    ? { label: "Administrador", variant: "default" as const, icon: ShieldCheck }
    : { label: "Colaborador", variant: "secondary" as const, icon: UserIcon };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative z-50 h-full
          bg-sidebar text-sidebar-foreground
          transition-all duration-300 ease-out
          flex flex-col
          ${collapsed ? "w-[72px]" : "w-[260px]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0">
              <span className="text-sidebar-primary-foreground font-heading font-bold text-sm">PF</span>
            </div>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-heading font-bold text-base text-sidebar-foreground whitespace-nowrap"
              >
                ProteticFlow
              </motion.span>
            )}
          </div>
        </div>

        {/* Navigation — filtered by role */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Tooltip key={item.path} delayDuration={collapsed ? 100 : 1000}>
                <TooltipTrigger asChild>
                  <Link href={item.path}>
                    <div
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl
                        transition-all duration-200 group cursor-pointer
                        ${active
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        }
                      `}
                      onClick={() => setMobileOpen(false)}
                    >
                      <item.icon
                        size={20}
                        strokeWidth={active ? 2 : 1.5}
                        className="shrink-0"
                      />
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`text-sm whitespace-nowrap ${active ? "font-semibold" : "font-medium"}`}
                        >
                          {item.label}
                        </motion.span>
                      )}
                      {active && !collapsed && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
                      )}
                    </div>
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" className="font-body">
                    {item.label}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>

        {/* Flow IA Button */}
        <div className="px-3 pb-2">
          <Tooltip delayDuration={collapsed ? 100 : 1000}>
            <TooltipTrigger asChild>
              <Link href="/flow-ia">
                <div
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl
                    transition-all duration-200 cursor-pointer
                    ${isActive("/flow-ia")
                      ? "bg-sidebar-primary/20 text-sidebar-primary"
                      : "bg-sidebar-accent/30 text-sidebar-primary hover:bg-sidebar-primary/15"
                    }
                  `}
                  onClick={() => setMobileOpen(false)}
                >
                  <Bot size={20} strokeWidth={1.5} className="shrink-0" />
                  {!collapsed && (
                    <span className="text-sm font-semibold whitespace-nowrap">Flow IA</span>
                  )}
                </div>
              </Link>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="font-body">
                Flow IA
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* Collapse toggle */}
        <div className="hidden lg:flex px-3 pb-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent/30 transition-all duration-200"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!collapsed && <span className="text-xs">Recolher</span>}
          </button>
        </div>

        {/* User section with role badge */}
        <div className="border-t border-sidebar-border p-3">
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-xs font-heading font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">
                  {displayName}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <roleBadge.icon size={10} className={isAdmin ? "text-amber-400" : "text-sidebar-foreground/50"} />
                  <p className={`text-[10px] font-body truncate ${isAdmin ? "text-amber-400" : "text-sidebar-foreground/50"}`}>
                    {roleBadge.label}
                  </p>
                </div>
              </div>
            )}
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent/30 shrink-0"
                onClick={() => logout()}
              >
                <LogOut size={16} />
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </Button>
            <div className="relative hidden sm:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar trabalhos, clientes..."
                className="h-9 w-64 lg:w-80 pl-9 pr-4 rounded-xl bg-muted/50 border-0 text-sm font-body placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Push Notifications Toggle */}
            <PushNotificationButton />

            {/* Notifications Bell */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                  <Bell size={18} className="text-muted-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between p-3 border-b border-border">
                  <h3 className="text-sm font-heading font-semibold">Notificações</h3>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-primary h-7"
                      onClick={() => markAllReadMutation.mutate()}
                    >
                      <Check size={12} className="mr-1" /> Marcar todas como lidas
                    </Button>
                  )}
                </div>
                <ScrollArea className="max-h-80">
                  {!notifications || notifications.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      <Bell size={24} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-body">Nenhuma notificação</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {notifications.map((n: any) => (
                        <div
                          key={n.id}
                          className={`p-3 flex items-start gap-3 hover:bg-muted/30 transition-colors cursor-pointer ${!n.isRead ? "bg-primary/5" : ""}`}
                          onClick={() => { if (!n.isRead) markReadMutation.mutate({ id: n.id }); }}
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.isRead ? "bg-primary" : "bg-transparent"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-body font-medium text-foreground">{n.title}</p>
                            <p className="text-xs text-muted-foreground font-body mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground/60 font-body mt-1">
                              {new Date(n.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>

            <div className="hidden sm:flex items-center gap-2 ml-2 pl-2 border-l border-border">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-heading font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground hidden md:block">{displayName}</span>
                <span className={`text-[10px] hidden md:block ${isAdmin ? "text-amber-600 font-semibold" : "text-muted-foreground"}`}>
                  {roleBadge.label}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
