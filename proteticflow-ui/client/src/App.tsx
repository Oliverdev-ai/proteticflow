import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Trabalhos from "./pages/Trabalhos";
import TabelaPrecos from "./pages/TabelaPrecos";
import Configuracoes from "./pages/Configuracoes";
import FlowIA from "./pages/FlowIA";
import GestaoUsuarios from "./pages/GestaoUsuarios";
import Financeiro from "./pages/Financeiro";
import Kanban from "@/pages/Kanban";
import Estoque from "@/pages/Estoque";
import Relatorios from "@/pages/Relatorios";
import RelatoriosPDF from "@/pages/RelatoriosPDF";
import ConfigLab from "@/pages/ConfigLab";
import Login from "./pages/Login";
import Portal from "@/pages/Portal";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

/**
 * AdminRoute — Protege rotas que só admin pode acessar.
 * Colaborador é redirecionado para o dashboard com toast de aviso.
 */
function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user } = useAuth();
  const toastShown = useRef(false);

  useEffect(() => {
    if (user && user.role !== "admin" && !toastShown.current) {
      toastShown.current = true;
      toast.error("Acesso restrito", {
        description: "Você não tem permissão para acessar esta área. Contate o administrador.",
      });
    }
  }, [user]);

  if (!user) return null; // loading
  if (user.role !== "admin") return <Redirect to="/" />;
  return <Component />;
}

function DashboardRoutes() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/clientes" component={Clientes} />
        <Route path="/trabalhos" component={Trabalhos} />
        <Route path="/tabela-precos">
          <AdminRoute component={TabelaPrecos} />
        </Route>
        <Route path="/configuracoes">
          <AdminRoute component={Configuracoes} />
        </Route>
        <Route path="/flow-ia" component={FlowIA} />
        <Route path="/kanban" component={Kanban} />
          <Route path="/estoque" component={Estoque} />
        <Route path="/relatorios" component={Relatorios} />
        <Route path="/relatorios-pdf">
          <AdminRoute component={RelatoriosPDF} />
        </Route>
        <Route path="/config-lab">
          <AdminRoute component={ConfigLab} />
        </Route>
        <Route path="/financeiro">
          <AdminRoute component={Financeiro} />
        </Route>
        <Route path="/usuarios">
          <AdminRoute component={GestaoUsuarios} />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/404" component={NotFound} />
      {/* Rota pública do Portal do Cliente — sem DashboardLayout */}
      <Route path="/portal/:token" component={Portal} />
      <Route component={DashboardRoutes} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
