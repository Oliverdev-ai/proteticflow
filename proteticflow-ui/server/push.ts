/**
 * push.ts — Web Push helper
 * Envia notificações push usando web-push (VAPID).
 * Limpa subscriptions expiradas automaticamente.
 */
import webpush from "web-push";
import { ENV } from "./_core/env";
import {
  getAllPushSubscriptions,
  getUserPushSubscriptions,
  deleteExpiredSubscription,
  touchPushSubscription,
} from "./db.push";

export type PushPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

let vapidInitialized = false;

function ensureVapid() {
  if (vapidInitialized) return;
  if (!ENV.vapidPublicKey || !ENV.vapidPrivateKey) {
    console.warn("[Push] VAPID keys not configured — push notifications disabled");
    return;
  }
  webpush.setVapidDetails(
    `mailto:${ENV.smtpFrom || "noreply@proteticflow.com"}`,
    ENV.vapidPublicKey,
    ENV.vapidPrivateKey
  );
  vapidInitialized = true;
}

export function isVapidConfigured(): boolean {
  return !!(ENV.vapidPublicKey && ENV.vapidPrivateKey);
}

/**
 * Envia push para uma subscription específica.
 * Retorna true em sucesso, false em falha (subscription inválida é removida).
 */
export async function sendPushToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<boolean> {
  ensureVapid();
  if (!vapidInitialized) return false;

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
      { TTL: 86400 } // 24h TTL
    );
    await touchPushSubscription(subscription.endpoint);
    return true;
  } catch (err: any) {
    // 410 Gone ou 404 = subscription expirada/inválida → remover
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      await deleteExpiredSubscription(subscription.endpoint);
      console.info(`[Push] Removed expired subscription: ${subscription.endpoint.slice(0, 60)}...`);
    } else {
      console.error("[Push] Send error:", err?.message ?? err);
    }
    return false;
  }
}

/**
 * Envia push para todos os dispositivos de um usuário.
 * Retorna número de envios bem-sucedidos.
 */
export async function sendPushToUser(
  userId: number,
  payload: PushPayload
): Promise<number> {
  const subscriptions = await getUserPushSubscriptions(userId);
  if (subscriptions.length === 0) return 0;

  let sent = 0;
  await Promise.all(
    subscriptions.map(async (sub) => {
      const ok = await sendPushToSubscription(sub, payload);
      if (ok) sent++;
    })
  );
  return sent;
}

/**
 * Broadcast push para todos os usuários com subscription ativa.
 * Retorna { sent, failed, total }.
 */
export async function broadcastPush(payload: PushPayload): Promise<{
  sent: number;
  failed: number;
  total: number;
}> {
  const all = await getAllPushSubscriptions();
  let sent = 0;
  let failed = 0;

  await Promise.all(
    all.map(async (sub) => {
      const ok = await sendPushToSubscription(sub, payload);
      if (ok) sent++;
      else failed++;
    })
  );

  return { sent, failed, total: all.length };
}
