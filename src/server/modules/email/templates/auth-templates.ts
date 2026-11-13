import type { EmailMessage } from "@/server/modules/email/email.types";
import { renderHtml, renderText, type LayoutParts } from "./layout";

/** Escapa HTML para evitar injeção em conteúdo dinâmico (ex.: nome do usuário). */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function build(
  template: EmailMessage["template"],
  to: string,
  subject: string,
  parts: LayoutParts,
  related?: { type: string; id: string },
): EmailMessage {
  return {
    to,
    subject,
    template,
    html: renderHtml(parts),
    text: renderText(parts),
    relatedEntityType: related?.type ?? null,
    relatedEntityId: related?.id ?? null,
  };
}

export interface ConfirmationParams {
  to: string;
  fullName: string;
  confirmationUrl: string;
  expiresInLabel: string; // ex.: "24 horas"
}

export function buildEmailConfirmation(p: ConfirmationParams): EmailMessage {
  return build(
    "EMAIL_CONFIRMATION",
    p.to,
    "Confirmação de cadastro - Sistema de Cautela de Veículos",
    {
      heading: "Confirme seu cadastro",
      paragraphs: [
        `Olá, ${escapeHtml(p.fullName)}.`,
        "Recebemos uma solicitação de cadastro com este e-mail na plataforma. Para ativar sua conta, confirme seu endereço clicando no botão abaixo.",
        `Por segurança, este link expira em ${escapeHtml(p.expiresInLabel)}.`,
      ],
      action: { label: "Confirmar cadastro", url: p.confirmationUrl },
      footerNote:
        "Se você não solicitou este cadastro, ignore esta mensagem — nenhuma conta será ativada.",
    },
  );
}

export interface PasswordResetParams {
  to: string;
  fullName: string;
  resetUrl: string;
  expiresInLabel: string; // ex.: "30 minutos"
}

export function buildPasswordReset(p: PasswordResetParams): EmailMessage {
  return build("PASSWORD_RESET", p.to, "Recuperação de senha - Sistema de Cautela de Veículos", {
    heading: "Redefinição de senha",
    paragraphs: [
      `Olá, ${escapeHtml(p.fullName)}.`,
      "Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.",
      `Este link expira em ${escapeHtml(p.expiresInLabel)} e só pode ser usado uma vez.`,
    ],
    action: { label: "Redefinir senha", url: p.resetUrl },
    footerNote:
      "Se você não solicitou a redefinição, ignore esta mensagem — sua senha atual permanece válida.",
  });
}
