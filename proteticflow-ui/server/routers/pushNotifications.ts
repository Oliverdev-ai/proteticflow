/**
 * pushNotifications.ts — tRPC router para Web Push
 * Procedures: subscribe, unsubscribe, getStatus, testPush, broadcastPush (admin)
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import {
  upsertPushSubscription,
  deletePushSubscription,
  getUserPushSubscriptions,
} from "../db.push";
import {
  sendPushToUser,
  broadcastPush,
  isVapidConfigured,
} from "../push";
import { ENV } from "../_core/env";

const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const pushNotificationsRouter = router({
  /** Retorna a chave pública VAPID para o frontend registrar a subscription */
  getVapidPublicKey: protectedProcedure.query(() => {
    return {
      publicKey: ENV.vapidPublicKey || null,
      isConfigured: isVapidConfigured(),
    };
  }),

  /** Registra ou atualiza uma subscription de push para o usuário autenticado */
  subscribe: protectedProcedure
    .input(
      z.object({
        subscription: PushSubscriptionSchema,
        userAgent: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isVapidConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Push notifications não configuradas (VAPID keys ausentes).",
        });
      }

      const result = await upsertPushSubscription(
        ctx.user.id,
        input.subscription,
        input.userAgent
      );

      if (!result) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao salvar subscription de push.",
        });
      }

      return { success: true, subscriptionId: result.id };
    }),

  /** Remove a subscription de push do dispositivo atual */
  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      await deletePushSubscription(ctx.user.id, input.endpoint);
      return { success: true };
    }),

  /** Retorna o status de push para o usuário (quantas subscriptions ativas) */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const subscriptions = await getUserPushSubscriptions(ctx.user.id);
    return {
      isConfigured: isVapidConfigured(),
      activeSubscriptions: subscriptions.length,
      devices: subscriptions.map((s) => ({
        id: s.id,
        endpoint: s.endpoint.slice(0, 60) + "...",
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt,
      })),
    };
  }),

  /** Envia uma notificação de teste para o usuário atual */
  testPush: protectedProcedure.mutation(async ({ ctx }) => {
    if (!isVapidConfigured()) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Push notifications não configuradas.",
      });
    }

    const sent = await sendPushToUser(ctx.user.id, {
      title: "ProteticFlow — Teste",
      body: "Notificações push funcionando corretamente! ✓",
      icon: "https://d2xsxph8kpxj0f.cloudfront.net/310419663031704091/e5qym9UxhBWYiSZbfAJzwi/icon-192_70c6975f.png",
      url: "/",
      tag: "test-push",
    });

    if (sent === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Nenhuma subscription ativa encontrada. Ative as notificações primeiro.",
      });
    }

    return { success: true, sent };
  }),

  /** [Admin] Broadcast push para todos os usuários com subscription ativa */
  broadcast: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(100),
        body: z.string().min(1).max(300),
        url: z.string().optional(),
        tag: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (!isVapidConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Push notifications não configuradas.",
        });
      }

      const result = await broadcastPush({
        title: input.title,
        body: input.body,
        icon: "https://d2xsxph8kpxj0f.cloudfront.net/310419663031704091/e5qym9UxhBWYiSZbfAJzwi/icon-192_70c6975f.png",
        url: input.url,
        tag: input.tag,
      });

      return result;
    }),
});
