import nodemailer from "nodemailer";
import { env } from "@/lib/validations/env";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function createTransport() {
  if (!env.SMTP_HOST || !env.EMAIL_FROM) return null;
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER
      ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
      : undefined,
  });
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const transporter = createTransport();
  if (!transporter) {
    console.warn("[email] SMTP not configured, skipping email:", payload.subject);
    return;
  }
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
}

export function notificationEmailHtml(title: string, body: string, link?: string | null, appUrl?: string): string {
  const buttonHtml = link
    ? `<tr><td align="center" style="padding:20px 0"><table border="0" cellspacing="0" cellpadding="0"><tr><td align="center" style="border-radius:5px" bgcolor="#2563eb"><a href="${appUrl ?? ""}${link}" target="_blank" style="font-size:16px;font-family:Helvetica,Arial,sans-serif;color:#fff;text-decoration:none;border-radius:5px;padding:10px 20px;border:1px solid #2563eb;display:inline-block;font-weight:bold;">View</a></td></tr></table></td></tr>`
    : "";
  return `<body style="background:#f9f9f9"><table width="100%" border="0" cellspacing="20" cellpadding="0" style="background:#fff;max-width:600px;margin:auto;border-radius:10px"><tr><td align="center" style="padding:10px 0;font-size:22px;font-family:Helvetica,Arial,sans-serif;color:#444"><strong>${title}</strong></td></tr><tr><td style="padding:0 20px 10px;font-size:16px;line-height:22px;font-family:Helvetica,Arial,sans-serif;color:#444">${body}</td></tr>${buttonHtml}<tr><td align="center" style="padding:0 0 10px;font-size:13px;font-family:Helvetica,Arial,sans-serif;color:#888">Gigahack Platform</td></tr></table></body>`;
}
