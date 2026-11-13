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

export interface RequestReceivedParams {
  to: string;
  fullName: string;
  publicCode: string;
  destination: string;
  withdrawalDate: string; // já formatado (ex.: 09/06/2026)
  returnDate: string;
  detailsUrl: string;
  requestId: string;
}

export function buildRequestReceived(p: RequestReceivedParams): EmailMessage {
  return build(
    "REQUEST_RECEIVED",
    p.to,
    `Solicitação recebida (${p.publicCode}) - Sistema de Cautela de Veículos`,
    {
      heading: "Recebemos sua solicitação",
      paragraphs: [
        `Olá, ${escapeHtml(p.fullName)}.`,
        `Sua solicitação de cautela <strong>${escapeHtml(p.publicCode)}</strong> foi recebida e está em análise.`,
        `Período: <strong>${escapeHtml(p.withdrawalDate)}</strong> a <strong>${escapeHtml(p.returnDate)}</strong>.<br>Destino: ${escapeHtml(p.destination)}.`,
        "Você receberá um novo e-mail quando a análise for concluída.",
      ],
      action: { label: "Acompanhar solicitação", url: p.detailsUrl },
      footerNote: "Em caso de dúvidas, contate a SATGF/SEPLAG com o código da solicitação.",
    },
    { type: "VehicleRequest", id: p.requestId },
  );
}

export interface RequestApprovedParams {
  to: string;
  fullName: string;
  publicCode: string;
  cautionCode: string;
  vehicleLabel: string; // ex.: "L200 Triton — RRZ-5I81"
  withdrawalDate: string;
  withdrawalTime: string;
  returnDate: string;
  returnTime: string;
  detailsUrl: string;
  requestId: string;
}

export function buildRequestApproved(p: RequestApprovedParams): EmailMessage {
  return build(
    "REQUEST_APPROVED",
    p.to,
    `Solicitação aprovada (${p.publicCode}) - Sistema de Cautela de Veículos`,
    {
      heading: "Sua solicitação foi aprovada",
      paragraphs: [
        `Olá, ${escapeHtml(p.fullName)}.`,
        `Sua solicitação <strong>${escapeHtml(p.publicCode)}</strong> foi aprovada e vinculada à cautela <strong>${escapeHtml(p.cautionCode)}</strong>.`,
        `Veículo liberado: <strong>${escapeHtml(p.vehicleLabel)}</strong>.<br>Retirada: ${escapeHtml(p.withdrawalDate)} às ${escapeHtml(p.withdrawalTime)}.<br>Devolução prevista: ${escapeHtml(p.returnDate)} às ${escapeHtml(p.returnTime)}.`,
        "Acesse a plataforma para preencher o <strong>checklist de retirada</strong> no momento de retirar o veículo.",
      ],
      action: { label: "Abrir cautela", url: p.detailsUrl },
      footerNote:
        "Lembre-se de devolver o veículo no horário previsto e preencher o checklist de devolução.",
    },
    { type: "VehicleRequest", id: p.requestId },
  );
}

export interface RequestRejectedParams {
  to: string;
  fullName: string;
  publicCode: string;
  rejectionReason: string;
  detailsUrl: string;
  requestId: string;
}

export function buildRequestRejected(p: RequestRejectedParams): EmailMessage {
  return build(
    "REQUEST_REJECTED",
    p.to,
    `Solicitação não aprovada (${p.publicCode}) - Sistema de Cautela de Veículos`,
    {
      heading: "Sua solicitação não foi aprovada",
      paragraphs: [
        `Olá, ${escapeHtml(p.fullName)}.`,
        `Sua solicitação <strong>${escapeHtml(p.publicCode)}</strong> não foi aprovada.`,
        `Motivo informado: ${escapeHtml(p.rejectionReason)}.`,
        "Caso necessário, você pode abrir uma nova solicitação ajustando os dados conforme o motivo.",
      ],
      action: { label: "Ver detalhes", url: p.detailsUrl },
      footerNote: "Em caso de dúvidas, contate a SATGF/SEPLAG com o código da solicitação.",
    },
    { type: "VehicleRequest", id: p.requestId },
  );
}
