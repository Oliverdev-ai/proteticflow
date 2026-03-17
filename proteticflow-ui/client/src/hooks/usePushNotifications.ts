/**
 * usePushNotifications — Hook para gerenciar Web Push no frontend
 * Gerencia permissão, subscription e estado de notificações push.
 */
import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);

  const { data: vapidData } = trpc.push.getVapidPublicKey.useQuery(undefined, {
    retry: false,
  });

  const { data: statusData, refetch: refetchStatus } =
    trpc.push.getStatus.useQuery(undefined, { retry: false });

  const subscribeMutation = trpc.push.subscribe.useMutation();
  const unsubscribeMutation = trpc.push.unsubscribe.useMutation();
  const testPushMutation = trpc.push.testPush.useMutation();

  // Detectar suporte e permissão atual
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PushPermission);
  }, []);

  // Verificar se já está subscrito no service worker
  useEffect(() => {
    if (permission === "unsupported" || permission === "denied") return;

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) {
          setIsSubscribed(true);
          setCurrentEndpoint(sub.endpoint);
        }
      })
      .catch(() => {});
  }, [permission]);

  /** Converte ArrayBuffer para string base64 URL-safe */
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from(Array.from(rawData).map((c) => c.charCodeAt(0)));
  }

  /** Solicita permissão e registra subscription */
  const subscribe = useCallback(async () => {
    if (!vapidData?.publicKey) {
      toast.error("Notificações push não configuradas no servidor.");
      return false;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Seu navegador não suporta notificações push.");
      return false;
    }

    setIsLoading(true);
    try {
      // Solicitar permissão
      const result = await Notification.requestPermission();
      setPermission(result as PushPermission);

      if (result !== "granted") {
        toast.error("Permissão de notificações negada.");
        return false;
      }

      // Registrar subscription no service worker
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey).buffer as ArrayBuffer,
      });

      const subJson = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      // Salvar no servidor
      await subscribeMutation.mutateAsync({
        subscription: subJson,
        userAgent: navigator.userAgent,
      });

      setIsSubscribed(true);
      setCurrentEndpoint(subJson.endpoint);
      await refetchStatus();
      toast.success("Notificações push ativadas!");
      return true;
    } catch (err: any) {
      console.error("[Push] Subscribe error:", err);
      toast.error(err?.message ?? "Erro ao ativar notificações.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [vapidData, subscribeMutation, refetchStatus]);

  /** Remove a subscription do dispositivo atual */
  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        await sub.unsubscribe();
        await unsubscribeMutation.mutateAsync({ endpoint: sub.endpoint });
      }

      setIsSubscribed(false);
      setCurrentEndpoint(null);
      await refetchStatus();
      toast.success("Notificações push desativadas.");
    } catch (err: any) {
      console.error("[Push] Unsubscribe error:", err);
      toast.error("Erro ao desativar notificações.");
    } finally {
      setIsLoading(false);
    }
  }, [unsubscribeMutation, refetchStatus]);

  /** Envia uma notificação de teste */
  const sendTest = useCallback(async () => {
    try {
      await testPushMutation.mutateAsync();
      toast.success("Notificação de teste enviada!");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao enviar notificação de teste.");
    }
  }, [testPushMutation]);

  return {
    permission,
    isSubscribed,
    isLoading,
    isSupported: permission !== "unsupported",
    isConfigured: vapidData?.isConfigured ?? false,
    activeDevices: statusData?.activeSubscriptions ?? 0,
    currentEndpoint,
    subscribe,
    unsubscribe,
    sendTest,
  };
}
