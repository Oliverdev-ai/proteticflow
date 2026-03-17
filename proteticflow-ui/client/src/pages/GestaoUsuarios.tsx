import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Users, UserPlus, Shield, ShieldOff, Ban, CheckCircle2,
  Mail, Clock, Search, MoreVertical, Copy, X, Send,
  UserCog, RefreshCw
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GestaoUsuarios() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"user" | "admin">("user");
  const [confirmAction, setConfirmAction] = useState<{
    type: "deactivate" | "reactivate" | "changeRole";
    userId: number;
    userName: string;
    newRole?: "user" | "admin";
  } | null>(null);

  const utils = trpc.useUtils();
  const { data: usersList, isLoading: loadingUsers } = trpc.adminUsers.list.useQuery();
  const { data: invitesList, isLoading: loadingInvites } = trpc.adminUsers.listInvites.useQuery();

  const inviteMutation = trpc.adminUsers.invite.useMutation({
    onSuccess: (data) => {
      toast.success("Convite enviado com sucesso!", {
        description: `Token: ${data.token.slice(0, 12)}...`,
      });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("user");
      utils.adminUsers.listInvites.invalidate();
    },
    onError: (err) => toast.error("Erro ao enviar convite", { description: err.message }),
  });

  const updateRoleMutation = trpc.adminUsers.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!");
      utils.adminUsers.list.invalidate();
      setConfirmAction(null);
    },
    onError: (err) => toast.error("Erro ao atualizar perfil", { description: err.message }),
  });

  const deactivateMutation = trpc.adminUsers.deactivate.useMutation({
    onSuccess: () => {
      toast.success("Conta desativada com sucesso!");
      utils.adminUsers.list.invalidate();
      setConfirmAction(null);
    },
    onError: (err) => toast.error("Erro ao desativar conta", { description: err.message }),
  });

  const reactivateMutation = trpc.adminUsers.reactivate.useMutation({
    onSuccess: () => {
      toast.success("Conta reativada com sucesso!");
      utils.adminUsers.list.invalidate();
      setConfirmAction(null);
    },
    onError: (err) => toast.error("Erro ao reativar conta", { description: err.message }),
  });

  const revokeInviteMutation = trpc.adminUsers.revokeInvite.useMutation({
    onSuccess: () => {
      toast.success("Convite revogado!");
      utils.adminUsers.listInvites.invalidate();
    },
    onError: (err) => toast.error("Erro ao revogar convite", { description: err.message }),
  });

  const deadlineCheckMutation = trpc.deadlineCheck.run.useMutation({
    onSuccess: (data) => {
      toast.success(`Verificação concluída: ${data.notificationsCreated} notificações criadas de ${data.checked} trabalhos verificados.`);
    },
    onError: (err) => toast.error("Erro na verificação", { description: err.message }),
  });

  const filteredUsers = (usersList ?? []).filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(s)) ||
      (u.email && u.email.toLowerCase().includes(s))
    );
  });

  const pendingInvites = (invitesList ?? []).filter((i) => i.status === "pending");

  const getRoleBadge = (role: string) => {
    if (role === "admin") {
      return (
        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25">
          <Shield className="w-3 h-3 mr-1" /> Administrador
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-slate-400 border-slate-600">
        <Users className="w-3 h-3 mr-1" /> Colaborador
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Ativo
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-500/15 text-red-400 border-red-500/30">
        <Ban className="w-3 h-3 mr-1" /> Desativado
      </Badge>
    );
  };

  const getInviteStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
      case "accepted":
        return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> Aceito</Badge>;
      case "expired":
        return <Badge className="bg-slate-500/15 text-slate-400 border-slate-500/30"><X className="w-3 h-3 mr-1" /> Expirado</Badge>;
      default:
        return null;
    }
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    switch (confirmAction.type) {
      case "deactivate":
        deactivateMutation.mutate({ id: confirmAction.userId });
        break;
      case "reactivate":
        reactivateMutation.mutate({ id: confirmAction.userId });
        break;
      case "changeRole":
        if (confirmAction.newRole) {
          updateRoleMutation.mutate({ id: confirmAction.userId, role: confirmAction.newRole });
        }
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <UserCog className="w-7 h-7 text-amber-500" />
            Gestão de Usuários
          </h1>
          <p className="text-slate-400 mt-1">
            Gerencie colaboradores, convites e permissões de acesso.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => deadlineCheckMutation.mutate()}
            disabled={deadlineCheckMutation.isPending}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${deadlineCheckMutation.isPending ? "animate-spin" : ""}`} />
            Verificar Prazos
          </Button>
          <Button
            onClick={() => setInviteOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Convidar Colaborador
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="users" className="data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400">
            <Users className="w-4 h-4 mr-2" />
            Usuários ({filteredUsers.length})
          </TabsTrigger>
          <TabsTrigger value="invites" className="data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400">
            <Mail className="w-4 h-4 mr-2" />
            Convites ({pendingInvites.length})
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
            />
          </div>

          {/* Users Table */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Usuário</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Perfil</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Último Acesso</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Carregando...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelf = u.id === currentUser?.id;
                      const initials = (u.name || "?")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();

                      return (
                        <tr key={u.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${
                                u.role === "admin"
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-slate-600 text-slate-300"
                              }`}>
                                {initials}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-200">
                                  {u.name || "Sem nome"}
                                  {isSelf && <span className="text-xs text-amber-500 ml-2">(você)</span>}
                                </p>
                                <p className="text-xs text-slate-500">{u.email || "Sem email"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">{getRoleBadge(u.role)}</td>
                          <td className="py-3 px-4">{getStatusBadge(u.isActive)}</td>
                          <td className="py-3 px-4 text-sm text-slate-400">
                            {u.lastSignedIn
                              ? new Date(u.lastSignedIn).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Nunca"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {!isSelf && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-200">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                                  {u.role === "user" ? (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setConfirmAction({
                                          type: "changeRole",
                                          userId: u.id,
                                          userName: u.name || "Usuário",
                                          newRole: "admin",
                                        })
                                      }
                                      className="text-slate-300 hover:text-slate-100 focus:text-slate-100 focus:bg-slate-700"
                                    >
                                      <Shield className="w-4 h-4 mr-2 text-amber-500" />
                                      Promover a Admin
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setConfirmAction({
                                          type: "changeRole",
                                          userId: u.id,
                                          userName: u.name || "Usuário",
                                          newRole: "user",
                                        })
                                      }
                                      className="text-slate-300 hover:text-slate-100 focus:text-slate-100 focus:bg-slate-700"
                                    >
                                      <ShieldOff className="w-4 h-4 mr-2 text-slate-400" />
                                      Rebaixar a Colaborador
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator className="bg-slate-700" />
                                  {u.isActive ? (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setConfirmAction({
                                          type: "deactivate",
                                          userId: u.id,
                                          userName: u.name || "Usuário",
                                        })
                                      }
                                      className="text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-slate-700"
                                    >
                                      <Ban className="w-4 h-4 mr-2" />
                                      Desativar Conta
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setConfirmAction({
                                          type: "reactivate",
                                          userId: u.id,
                                          userName: u.name || "Usuário",
                                        })
                                      }
                                      className="text-emerald-400 hover:text-emerald-300 focus:text-emerald-300 focus:bg-slate-700"
                                    >
                                      <CheckCircle2 className="w-4 h-4 mr-2" />
                                      Reativar Conta
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Invites Tab */}
        <TabsContent value="invites" className="mt-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Perfil</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Expira em</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Token</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingInvites ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Carregando...
                      </td>
                    </tr>
                  ) : (invitesList ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        Nenhum convite enviado ainda.
                      </td>
                    </tr>
                  ) : (
                    (invitesList ?? []).map((inv) => (
                      <tr key={inv.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-slate-500" />
                            <span className="text-sm text-slate-200">{inv.email}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">{getRoleBadge(inv.role)}</td>
                        <td className="py-3 px-4">{getInviteStatusBadge(inv.status)}</td>
                        <td className="py-3 px-4 text-sm text-slate-400">
                          {new Date(inv.expiresAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(inv.token);
                              toast.success("Token copiado!");
                            }}
                            className="text-xs text-slate-400 hover:text-slate-200 h-7 px-2"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            {inv.token.slice(0, 12)}...
                          </Button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {inv.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => revokeInviteMutation.mutate({ id: inv.id })}
                              disabled={revokeInviteMutation.isPending}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Revogar
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Invite Modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-100">
              <UserPlus className="w-5 h-5 text-amber-500" />
              Convidar Colaborador
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Envie um convite para um novo membro da equipe. O convite expira em 7 dias.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-slate-300">Email</Label>
              <Input
                type="email"
                placeholder="colaborador@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="bg-slate-900 border-slate-600 text-slate-200 placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Perfil de Acesso</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "user" | "admin")}>
                <SelectTrigger className="bg-slate-900 border-slate-600 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="user" className="text-slate-200 focus:bg-slate-700 focus:text-slate-100">
                    Colaborador — Acesso básico (sem financeiro/configurações)
                  </SelectItem>
                  <SelectItem value="admin" className="text-slate-200 focus:bg-slate-700 focus:text-slate-100">
                    Administrador — Acesso total ao sistema
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
              <p className="text-xs text-slate-400">
                <strong className="text-slate-300">Colaborador:</strong> Pode listar/criar/atualizar clientes e trabalhos, usar Flow IA. Não acessa financeiro, relatórios, configurações ou tabela de preços.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                <strong className="text-slate-300">Administrador:</strong> Acesso total incluindo financeiro, configurações, gestão de usuários e todas as operações CRUD.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancelar
            </Button>
            <Button
              onClick={() => inviteMutation.mutate({ email: inviteEmail, role: inviteRole })}
              disabled={!inviteEmail || inviteMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              {inviteMutation.isPending ? "Enviando..." : "Enviar Convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Action Modal */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              {confirmAction?.type === "deactivate" && "Desativar Conta"}
              {confirmAction?.type === "reactivate" && "Reativar Conta"}
              {confirmAction?.type === "changeRole" && "Alterar Perfil"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {confirmAction?.type === "deactivate" &&
                `Tem certeza que deseja desativar a conta de ${confirmAction.userName}? O usuário perderá acesso ao sistema imediatamente.`}
              {confirmAction?.type === "reactivate" &&
                `Tem certeza que deseja reativar a conta de ${confirmAction?.userName}? O usuário voltará a ter acesso ao sistema.`}
              {confirmAction?.type === "changeRole" &&
                `Tem certeza que deseja alterar o perfil de ${confirmAction?.userName} para ${confirmAction?.newRole === "admin" ? "Administrador" : "Colaborador"}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={updateRoleMutation.isPending || deactivateMutation.isPending || reactivateMutation.isPending}
              className={
                confirmAction?.type === "deactivate"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : confirmAction?.type === "reactivate"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-amber-600 hover:bg-amber-700 text-white"
              }
            >
              {confirmAction?.type === "deactivate" && "Desativar"}
              {confirmAction?.type === "reactivate" && "Reativar"}
              {confirmAction?.type === "changeRole" && "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
