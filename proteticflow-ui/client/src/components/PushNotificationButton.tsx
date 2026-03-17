/**
 * PushNotificationButton — Botão de ativar/desativar notificações push no header
 * Exibe o estado atual (ativo/inativo/sem suporte) e permite toggle.
 */
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Badge } from "@/components/ui/badge";

export function PushNotificationButton() {
  const {
    permission,
    isSubscribed,
    isLoading,
    isSupported,
    isConfigured,
    activeDevices,
    subscribe,
    unsubscribe,
    sendTest,
  } = usePushNotifications();

  // Não mostrar se o browser não suporta push
  if (!isSupported) return null;

  // Não mostrar se VAPID não está configurado no servidor
  if (!isConfigured) return null;

  const icon = isLoading ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : isSubscribed ? (
    <BellRing className="h-4 w-4 text-amber-400" />
  ) : permission === "denied" ? (
    <BellOff className="h-4 w-4 text-muted-foreground" />
  ) : (
    <Bell className="h-4 w-4 text-muted-foreground" />
  );

  const label = isSubscribed
    ? "Notificações ativas"
    : permission === "denied"
    ? "Notificações bloqueadas"
    : "Ativar notificações";

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8"
                disabled={isLoading}
              >
                {icon}
                {isSubscribed && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-400 ring-1 ring-background" />
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2">
            <BellRing className="h-4 w-4" />
            Notificações Push
            {isSubscribed && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {activeDevices} dispositivo{activeDevices !== 1 ? "s" : ""}
              </Badge>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {permission === "denied" ? (
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              Bloqueado pelo navegador. Habilite nas configurações do site.
            </DropdownMenuItem>
          ) : isSubscribed ? (
            <>
              <DropdownMenuItem onClick={sendTest} disabled={isLoading}>
                <Bell className="mr-2 h-4 w-4" />
                Enviar notificação de teste
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={unsubscribe}
                disabled={isLoading}
                className="text-destructive focus:text-destructive"
              >
                <BellOff className="mr-2 h-4 w-4" />
                Desativar notificações
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onClick={subscribe} disabled={isLoading}>
              <Bell className="mr-2 h-4 w-4" />
              Ativar notificações push
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
