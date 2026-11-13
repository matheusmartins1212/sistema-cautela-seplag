import type { EmailMessage } from "@/server/modules/email/email.types";
import { renderHtml, renderText, type LayoutParts } from "./layout";

/** Escapa HTML para evitar injeção em conteúdo dinâmico. */
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

export interface WithdrawalReminderParams {
  to: string;
  fullName: string;
  publicCode: string;
  vehicleLabel: string;
  withdrawalDate: string;
  withdrawalTime: string;
  detailsUrl: string;
  cautionId: string;
}

export function buildWithdrawalReminder(p: WithdrawalReminderParams): EmailMessage {
  return build(
    "WITHDRAWAL_REMINDER",
    p.to,
    `Lembrete de retirada (${p.publicCode}) - Sistema de Cautela de Veículos`,
    {
      heading: "Lembrete: retirada de veículo próxima",
      paragraphs: [
        `Olá, ${escapeHtml(p.fullName)}.`,
        `A retirada do veículo da sua cautela <strong>${escapeHtml(p.publicCode)}</strong> está prevista para <strong>${escapeHtml(p.withdrawalDate)} às ${escapeHtml(p.withdrawalTime)}</strong>.`,
        `Veículo: <strong>${escapeHtml(p.vehicleLabel)}</strong>.`,
        "No momento da retirada, preencha o <strong>checklist de retirada</strong> na plataforma.",
      ],
      action: { label: "Abrir cautela", url: p.detailsUrl },
      footerNote:
        "Caso não vá mais utilizar o veículo, solicite o cancelamento à gestão de frota da SEPLAG.",
    },
    { type: "Caution", id: p.cautionId },
  );
}

export interface ReturnReminderParams {
  to: string;
  fullName: string;
  publicCode: string;
  vehicleLabel: string;
  returnDate: string;
  returnTime: string;
  detailsUrl: string;
  cautionId: string;
}

export function buildReturnReminder(p: ReturnReminderParams): EmailMessage {
  return build(
    "RETURN_REMINDER",
    p.to,
    `Lembrete de devolução (${p.publicCode}) - Sistema de Cautela de Veículos`,
    {
      heading: "Lembrete: devolução de veículo próxima",
      paragraphs: [
        `Olá, ${escapeHtml(p.fullName)}.`,
        `A devolução do veículo da sua cautela <strong>${escapeHtml(p.publicCode)}</strong> está prevista para <strong>${escapeHtml(p.returnDate)} às ${escapeHtml(p.returnTime)}</strong>.`,
        `Veículo: <strong>${escapeHtml(p.vehicleLabel)}</strong>.`,
        "Ao devolver, preencha o <strong>checklist de devolução</strong> na plataforma.",
      ],
      action: { label: "Abrir cautela", url: p.detailsUrl },
      footerNote:
        "A devolução fora do prazo é registrada e a cautela passa a constar como atrasada.",
    },
    { type: "Caution", id: p.cautionId },
  );
}

export interface OverdueAlertParams {
  to: string;
  fullName: string;
  publicCode: string;
  vehicleLabel: string;
  returnDate: string;
  returnTime: string;
  detailsUrl: string;
  cautionId: string;
}

export function buildOverdueAlert(p: OverdueAlertParams): EmailMessage {
  return build(
    "OVERDUE_ALERT",
    p.to,
    `Devolução ATRASADA (${p.publicCode}) - Sistema de Cautela de Veículos`,
    {
      heading: "Devolução atrasada",
      paragraphs: [
        `Olá, ${escapeHtml(p.fullName)}.`,
        `A devolução do veículo da cautela <strong>${escapeHtml(p.publicCode)}</strong> estava prevista para <strong>${escapeHtml(p.returnDate)} às ${escapeHtml(p.returnTime)}</strong> e ainda não foi registrada.`,
        `Veículo: <strong>${escapeHtml(p.vehicleLabel)}</strong>.`,
        "Regularize a devolução o quanto antes, preenchendo o checklist de devolução na plataforma.",
      ],
      action: { label: "Regularizar cautela", url: p.detailsUrl },
      footerNote:
        "Esta cautela consta como ATRASADA. Em caso de dúvidas, contate a gestão de frota da SEPLAG.",
    },
    { type: "Caution", id: p.cautionId },
  );
}
