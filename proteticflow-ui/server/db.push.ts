/**
 * db.push.ts — Push Subscription helpers
 * Gerencia subscriptions Web Push por usuário.
 * Cada usuário pode ter múltiplas subscriptions (diferentes dispositivos/browsers).
 */
import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { pushSubscriptions } from "../drizzle/schema";

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

/** Salva ou atualiza uma subscription de push para um usuário */
export async function upsertPushSubscription(
  userId: number,
  subscription: PushSubscriptionPayload,
  userAgent?: string
) {
  const db = await getDb();
  if (!db) return null;

  // Verifica se já existe subscription com esse endpoint
  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, subscription.endpoint));

  if (existing.length > 0) {
    // Atualiza auth/p256dh (podem mudar com re-subscription)
    await db
      .update(pushSubscriptions)
      .set({
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId,
        lastUsedAt: new Date(),
      })
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
    return existing[0];
  }

  // Insere nova subscription
  await db.insert(pushSubscriptions).values({
    userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    userAgent: userAgent?.slice(0, 512),
    lastUsedAt: new Date(),
  });

  const inserted = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, subscription.endpoint));

  return inserted[0] ?? null;
}

/** Remove uma subscription pelo endpoint */
export async function deletePushSubscription(userId: number, endpoint: string) {
  const db = await getDb();
  if (!db) return false;

  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint)
      )
    );
  return true;
}

/** Lista todas as subscriptions de um usuário */
export async function getUserPushSubscriptions(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
}

/** Lista todas as subscriptions (para broadcast) */
export async function getAllPushSubscriptions() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(pushSubscriptions);
}

/** Remove subscriptions inválidas (endpoint expirado) */
export async function deleteExpiredSubscription(endpoint: string) {
  const db = await getDb();
  if (!db) return;

  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
}

/** Atualiza lastUsedAt de uma subscription */
export async function touchPushSubscription(endpoint: string) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(pushSubscriptions)
    .set({ lastUsedAt: new Date() })
    .where(eq(pushSubscriptions.endpoint, endpoint));
}
