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
    `Lembrete de saída (${p.publicCode}) - Central de Veículos`,
    {
      heading: "Lembrete: viagem próxima",
      paragraphs: [
        `Olá, ${escapeHtml(p.fullName)}.`,
        `A saída da viagem <strong>${escapeHtml(p.publicCode)}</strong> está prevista para <strong>${escapeHtml(p.withdrawalDate)} às ${escapeHtml(p.withdrawalTime)}</strong>.`,
        `Veículo: <strong>${escapeHtml(p.vehicleLabel)}</strong>.`,
        "Ao pegar o veículo, preencha o <strong>checklist de saída</strong> na plataforma.",
      ],
      action: { label: "Abrir viagem", url: p.detailsUrl },
      footerNote: "Caso não vá mais utilizar o veículo, solicite o cancelamento à SATGF/SEPLAG.",
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
    `Lembrete de retorno (${p.publicCode}) - Central de Veículos`,
    {
      heading: "Lembrete: retorno do veículo próximo",
      paragraphs: [
        `Olá, ${escapeHtml(p.fullName)}.`,
        `O retorno do veículo da viagem <strong>${escapeHtml(p.publicCode)}</strong> está prevista para <strong>${escapeHtml(p.returnDate)} às ${escapeHtml(p.returnTime)}</strong>.`,
        `Veículo: <strong>${escapeHtml(p.vehicleLabel)}</strong>.`,
        "Ao devolver o veículo, preencha o <strong>checklist de retorno</strong> na plataforma.",
      ],
      action: { label: "Abrir viagem", url: p.detailsUrl },
      footerNote: "O retorno fora do prazo é registrado e a viagem passa a constar como atrasada.",
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
    `Retorno ATRASADO (${p.publicCode}) - Central de Veículos`,
    {
      heading: "Retorno atrasado",
      paragraphs: [
        `Olá, ${escapeHtml(p.fullName)}.`,
        `O retorno do veículo da viagem <strong>${escapeHtml(p.publicCode)}</strong> estava prevista para <strong>${escapeHtml(p.returnDate)} às ${escapeHtml(p.returnTime)}</strong> e ainda não foi registrada.`,
        `Veículo: <strong>${escapeHtml(p.vehicleLabel)}</strong>.`,
        "Regularize o quanto antes, preenchendo o checklist de retorno na plataforma.",
      ],
      action: { label: "Regularizar viagem", url: p.detailsUrl },
      footerNote: "Esta viagem consta como ATRASADA. Em caso de dúvidas, contate a SATGF/SEPLAG.",
    },
    { type: "Caution", id: p.cautionId },
  );
}
