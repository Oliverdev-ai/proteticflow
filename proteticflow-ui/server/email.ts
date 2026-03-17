/**
 * email.ts — ProteticFlow
 * Helper de envio de e-mail via Nodemailer com suporte a SMTP configurável.
 * Suporta: Gmail, Outlook, Resend (SMTP), Brevo, ou qualquer servidor SMTP.
 *
 * Variáveis de ambiente necessárias:
 *   SMTP_HOST     — ex: smtp.gmail.com | smtp.resend.com | smtp-relay.brevo.com
 *   SMTP_PORT     — ex: 587 (TLS) | 465 (SSL) | 25
 *   SMTP_SECURE   — "true" para SSL (porta 465), "false" para TLS (porta 587)
 *   SMTP_USER     — usuário do SMTP (ex: apikey para Resend, login para Gmail)
 *   SMTP_PASS     — senha ou API key do SMTP
 *   SMTP_FROM     — endereço remetente (ex: "ProteticFlow <noreply@seulab.com.br>")
 */

import nodemailer from "nodemailer";

export type EmailAttachment = {
  filename: string;
  content: string; // base64
  contentType: string;
  encoding: "base64";
};

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
};

export type SendEmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP não configurado. Defina SMTP_HOST, SMTP_USER e SMTP_PASS nas variáveis de ambiente."
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      // Aceita certificados auto-assinados em desenvolvimento
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "ProteticFlow <noreply@proteticflow.com.br>";

  try {
    const transporter = getTransporter();

    const info = await transporter.sendMail({
      from,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      attachments: options.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
        encoding: att.encoding,
      })),
    });

    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("[Email] Falha ao enviar e-mail:", err?.message ?? err);
    return { success: false, error: err?.message ?? "Erro desconhecido ao enviar e-mail." };
  }
}

/**
 * Verifica se o SMTP está configurado.
 * Retorna true se as variáveis obrigatórias estão presentes.
 */
export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/**
 * Gera o template HTML do e-mail de fechamento mensal.
 */
export function buildMonthlyClosingEmailHtml(params: {
  labName: string;
  labEmail?: string | null;
  labPhone?: string | null;
  clientName: string;
  month: number;
  year: number;
  totalAmount: number;
  jobCount: number;
  customMessage?: string;
  primaryColor?: string;
}): string {
  const {
    labName,
    labEmail,
    labPhone,
    clientName,
    month,
    year,
    totalAmount,
    jobCount,
    customMessage,
    primaryColor = "#1a56db",
  } = params;

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  const monthName = monthNames[month - 1] ?? String(month);
  const formattedTotal = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(totalAmount);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fechamento Mensal — ${monthName}/${year}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:${primaryColor};padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${labName}</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Fechamento Mensal — ${monthName} de ${year}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#374151;font-size:15px;">Olá, <strong>${clientName}</strong>,</p>
              <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
                Segue em anexo o relatório de fechamento mensal referente ao período de <strong>${monthName}/${year}</strong>.
                ${customMessage ? `</p><p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">${customMessage}` : ""}
              </p>
              <!-- Summary Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                          <span style="color:#6b7280;font-size:13px;">Período</span>
                          <span style="float:right;color:#111827;font-size:13px;font-weight:600;">${monthName} de ${year}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                          <span style="color:#6b7280;font-size:13px;">Total de Trabalhos</span>
                          <span style="float:right;color:#111827;font-size:13px;font-weight:600;">${jobCount} trabalho${jobCount !== 1 ? "s" : ""}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="color:#6b7280;font-size:13px;">Total a Pagar</span>
                          <span style="float:right;color:${primaryColor};font-size:16px;font-weight:700;">${formattedTotal}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.6;">
                O detalhamento completo de cada trabalho está disponível no PDF em anexo.
                Em caso de dúvidas, entre em contato conosco.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                ${labName}
                ${labEmail ? ` · <a href="mailto:${labEmail}" style="color:#9ca3af;">${labEmail}</a>` : ""}
                ${labPhone ? ` · ${labPhone}` : ""}
              </p>
              <p style="margin:4px 0 0;color:#d1d5db;font-size:11px;">
                Este e-mail foi gerado automaticamente pelo ProteticFlow.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
