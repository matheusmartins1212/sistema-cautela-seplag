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
    `Solicitação recebida (${p.publicCode}) - Central de Veículos`,
    {
      heading: "Recebemos sua solicitação",
      paragraphs: [
        `Olá, ${escapeHtml(p.fullName)}.`,
        `Sua solicitação de transporte <strong>${escapeHtml(p.publicCode)}</strong> foi recebida e está em análise pela central.`,
        `Período: <strong>${escapeHtml(p.withdrawalDate)}</strong> a <strong>${escapeHtml(p.returnDate)}</strong>.<br>Destino: ${escapeHtml(p.destination)}.`,
        "Você receberá um novo e-mail quando a central definir o veículo e o condutor.",
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
  /** Nulos quando o próprio solicitante dirige (cautela tradicional). */
  driverName: string | null;
  driverPhone: string | null;
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
    `Solicitação aprovada (${p.publicCode}) - Central de Veículos`,
    {
      heading: p.driverName ? "Seu transporte foi confirmado" : "Sua solicitação foi aprovada",
      paragraphs: [
        `Olá, ${escapeHtml(p.fullName)}.`,
        `Sua solicitação <strong>${escapeHtml(p.publicCode)}</strong> foi aprovada e gerou a viagem <strong>${escapeHtml(p.cautionCode)}</strong>.`,
        p.driverName
          ? `Veículo: <strong>${escapeHtml(p.vehicleLabel)}</strong>.<br>Condutor: <strong>${escapeHtml(p.driverName)}</strong> (${escapeHtml(p.driverPhone ?? "")}).`
          : `Veículo: <strong>${escapeHtml(p.vehicleLabel)}</strong>.<br>Você mesmo retira e dirige: na retirada, preencha o checklist de saída no sistema.`,
        `Saída: ${escapeHtml(p.withdrawalDate)} às ${escapeHtml(p.withdrawalTime)}.<br>Retorno previsto: ${escapeHtml(p.returnDate)} às ${escapeHtml(p.returnTime)}.`,
      ],
      action: { label: "Ver solicitação", url: p.detailsUrl },
      footerNote:
        "Em caso de mudança de horário ou destino, avise a central com o código da solicitação.",
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
    `Solicitação não aprovada (${p.publicCode}) - Central de Veículos`,
    {
      heading: "Sua solicitação não foi aprovada",
      paragraphs: [
        `Olá, ${escapeHtml(p.fullName)}.`,
        `Sua solicitação <strong>${escapeHtml(p.publicCode)}</strong> não foi aprovada.`,
        `Motivo informado: ${escapeHtml(p.rejectionReason)}.`,
        "Se precisar, abra uma nova solicitação ajustando os dados conforme o motivo.",
      ],
      action: { label: "Ver detalhes", url: p.detailsUrl },
      footerNote: "Em caso de dúvidas, contate a SATGF/SEPLAG com o código da solicitação.",
    },
    { type: "VehicleRequest", id: p.requestId },
  );
}

export interface TripAssignedParams {
  to: string;
  fullName: string;
  cautionCode: string;
  vehicleLabel: string;
  origin: string;
  destination: string;
  passengerCount: number | null;
  requesterName: string;
  requesterAgency: string | null;
  contactPhone: string;
  withdrawalDate: string;
  withdrawalTime: string;
  returnDate: string;
  returnTime: string;
  detailsUrl: string;
  cautionId: string;
}

/** Aviso ao condutor de que foi escalado para uma viagem. */
export function buildTripAssigned(p: TripAssignedParams): EmailMessage {
  const requester = p.requesterAgency
    ? `${escapeHtml(p.requesterName)} (${escapeHtml(p.requesterAgency)})`
    : escapeHtml(p.requesterName);
  const passengers = p.passengerCount !== null ? `<br>Passageiros: ${p.passengerCount}.` : "";
  return build(
    "TRIP_ASSIGNED",
    p.to,
    `Nova viagem (${p.cautionCode}) - Central de Veículos`,
    {
      heading: "Você foi escalado para uma viagem",
      paragraphs: [
        `Olá, ${escapeHtml(p.fullName)}.`,
        `A central escalou você para a viagem <strong>${escapeHtml(p.cautionCode)}</strong>.`,
        `Saída: <strong>${escapeHtml(p.withdrawalDate)} às ${escapeHtml(p.withdrawalTime)}</strong>, de ${escapeHtml(p.origin)}.<br>Destino: ${escapeHtml(p.destination)}.<br>Retorno previsto: ${escapeHtml(p.returnDate)} às ${escapeHtml(p.returnTime)}.`,
        `Veículo: <strong>${escapeHtml(p.vehicleLabel)}</strong>.${passengers}<br>Solicitante: ${requester}, contato ${escapeHtml(p.contactPhone)}.`,
        "Preencha o <strong>checklist de saída</strong> ao pegar o veículo e o <strong>checklist de retorno</strong> ao devolvê-lo.",
      ],
      action: { label: "Abrir viagem", url: p.detailsUrl },
      footerNote: "Em caso de imprevisto, avise a central o quanto antes.",
    },
    { type: "Caution", id: p.cautionId },
  );
}
