/**
 * routers/portal.ts — ProteticFlow
 * Portal do Cliente: acesso público via token + gestão admin de tokens
 *
 * Segurança:
 * - Procedures públicas: apenas leitura, sem dados financeiros
 * - Procedures admin: protectedProcedure + adminProcedure para gestão de tokens
 * - Token UUID v4, expiração obrigatória, revogação imediata
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "../_core/trpc";
import {
  generatePortalToken,
  validatePortalToken,
  getPortalData,
  trackPortalAccess,
  listPortalTokens,
  revokePortalToken,
  deletePortalToken,
} from "../db.portal";
import { sendEmail } from "../email";
import { getLabSettings } from "../db.labSettings";

export const portalRouter = router({
  // ─── Público: Validar token ──────────────────────────────
  // Chamado antes de carregar o portal para verificar se o token é válido
  validateToken: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const result = await validatePortalToken(input.token);
      if (!result.valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: result.reason ?? "Token inválido",
        });
      }
      return { valid: true };
    }),

  // ─── Público: Buscar dados do portal ────────────────────
  // Retorna OS do cliente sem dados financeiros
  getData: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const data = await getPortalData(input.token);
      if (!data) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Token inválido ou expirado",
        });
      }
      // Rastrear acesso em background (não bloqueia resposta)
      trackPortalAccess(input.token).catch(() => {});
      return data;
    }),

  // ─── Admin: Listar tokens de um cliente ─────────────────
  listTokens: protectedProcedure
    .input(z.object({ clientId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return listPortalTokens(input.clientId);
    }),

  // ─── Admin: Gerar novo token ─────────────────────────────
  generateToken: adminProcedure
    .input(
      z.object({
        clientId: z.number().int().positive(),
        label: z.string().min(1).max(128).default("Acesso padrão"),
        expiresDays: z.union([
          z.literal(30),
          z.literal(60),
          z.literal(90),
          z.literal(180),
          z.literal(365),
        ]).default(90),
      })
    )
    .mutation(async ({ input }) => {
      const token = await generatePortalToken(
        input.clientId,
        input.label,
        input.expiresDays
      );
      return { token };
    }),

  // ─── Admin: Revogar token ────────────────────────────────
  revokeToken: adminProcedure
    .input(z.object({ tokenId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await revokePortalToken(input.tokenId);
      return { success: true };
    }),

  // ─── Admin: Deletar token ────────────────────────────────
  deleteToken: adminProcedure
    .input(z.object({ tokenId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await deletePortalToken(input.tokenId);
      return { success: true };
    }),

  // ─── Admin: Enviar link do portal por e-mail ─────────────
  sendPortalLink: adminProcedure
    .input(
      z.object({
        clientId: z.number().int().positive(),
        clientName: z.string(),
        clientEmail: z.string().email(),
        token: z.string().min(1),
        origin: z.string().url(), // window.location.origin do frontend
        customMessage: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const lab = await getLabSettings();
      const portalUrl = `${input.origin}/portal/${input.token}`;

      const labName = lab?.labName ?? "Laboratório de Prótese";
      const primaryColor = lab?.primaryColor ?? "#1a56db";

      const htmlBody = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portal do Cliente — ${labName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:${primaryColor};padding:32px 40px;text-align:center;">
              ${lab?.logoUrl ? `<img src="${lab.logoUrl}" alt="${labName}" style="height:48px;margin-bottom:12px;"><br>` : ""}
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">${labName}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="color:#1a1a2e;font-size:18px;margin:0 0 16px;">Olá, ${input.clientName}!</h2>
              <p style="color:#4a5568;font-size:15px;line-height:1.6;margin:0 0 16px;">
                Você tem acesso ao <strong>Portal do Cliente</strong> do ${labName}. 
                Acompanhe o status das suas ordens de serviço em tempo real, 
                sem precisar entrar em contato com o laboratório.
              </p>
              ${input.customMessage ? `
              <div style="background:#f7fafc;border-left:4px solid ${primaryColor};padding:16px;border-radius:4px;margin:0 0 24px;">
                <p style="color:#4a5568;font-size:14px;margin:0;font-style:italic;">${input.customMessage}</p>
              </div>
              ` : ""}
              <p style="color:#4a5568;font-size:14px;margin:0 0 24px;">
                Clique no botão abaixo para acessar o portal:
              </p>
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${portalUrl}" 
                       style="display:inline-block;background:${primaryColor};color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:700;letter-spacing:0.5px;">
                      Acessar Portal →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#718096;font-size:12px;margin:0 0 8px;">
                Ou copie e cole este link no seu navegador:
              </p>
              <p style="color:${primaryColor};font-size:12px;word-break:break-all;margin:0 0 24px;">
                ${portalUrl}
              </p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">
              <p style="color:#a0aec0;font-size:12px;margin:0;">
                Este link é pessoal e intransferível. Em caso de dúvidas, entre em contato com o laboratório.
                ${lab?.email ? `<br>E-mail: ${lab.email}` : ""}
                ${lab?.phone ? ` · Telefone: ${lab.phone}` : ""}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      await sendEmail({
        to: input.clientEmail,
        subject: `Seu acesso ao Portal do Cliente — ${labName}`,
        html: htmlBody,
        text: `Olá, ${input.clientName}!\n\nAcesse o Portal do Cliente em: ${portalUrl}\n\n${input.customMessage ?? ""}\n\n${labName}`,
      });

      return { success: true };
    }),
});
