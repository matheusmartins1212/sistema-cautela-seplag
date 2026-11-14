import type { VehicleCategory, VehicleStatus, VehicleUsageType } from "@prisma/client";
import { formatPlate } from "@/shared/validation/plate";
import { VEHICLE_CATEGORY_LABEL, VEHICLE_STATUS_LABEL, VEHICLE_USAGE_LABEL } from "./labels";

/**
 * Traduz um registro de auditoria de veículo em texto legível para a tela de
 * detalhe. O registro bruto (ação + JSON) continua intacto no banco; aqui só
 * decidimos como apresentá-lo para quem administra a frota.
 */

export type VehicleAuditTone = "neutral" | "info" | "warning" | "success";

export interface VehicleAuditView {
  title: string;
  details: string[];
  tone: VehicleAuditTone;
}

const FIELD_LABEL: Record<string, string> = {
  brand: "Marca",
  model: "Modelo",
  plate: "Placa",
  internalCode: "Código interno",
  category: "Categoria",
  usageType: "Tipo de uso",
  linkedSector: "Setor vinculado",
  agency: "Órgão / Agência",
  currentMileage: "Quilometragem",
  notes: "Observações administrativas",
  active: "Ativo",
};

const EMPTY = "(vazio)";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function statusLabel(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return EMPTY;
  return VEHICLE_STATUS_LABEL[value as VehicleStatus] ?? value;
}

export function formatVehicleFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return EMPTY;
  switch (field) {
    case "plate":
      return typeof value === "string" ? formatPlate(value) : String(value);
    case "category":
      return VEHICLE_CATEGORY_LABEL[value as VehicleCategory] ?? String(value);
    case "usageType":
      return VEHICLE_USAGE_LABEL[value as VehicleUsageType] ?? String(value);
    case "currentMileage": {
      const km = typeof value === "number" ? value : Number(value);
      return Number.isFinite(km) ? `${km.toLocaleString("pt-BR")} km` : String(value);
    }
    case "active":
      return value === true ? "Sim" : value === false ? "Não" : String(value);
    default: {
      const text = String(value);
      return text.length > 80 ? `${text.slice(0, 77)}...` : text;
    }
  }
}

function describeChanges(metadata: Record<string, unknown> | null): string[] {
  const changes = asRecord(metadata?.changes);
  if (!changes) return [];
  return Object.entries(changes).map(([field, raw]) => {
    const change = asRecord(raw);
    const label = FIELD_LABEL[field] ?? field;
    // Observações podem ser longas: mostrar o texto inteiro antes e depois
    // poluiria a linha. Basta indicar que foram alteradas.
    if (field === "notes") return `${label} atualizadas`;
    return `${label}: ${formatVehicleFieldValue(field, change?.from)} → ${formatVehicleFieldValue(
      field,
      change?.to,
    )}`;
  });
}

function reasonLine(metadata: Record<string, unknown> | null): string[] {
  const reason = metadata?.reason;
  return typeof reason === "string" && reason.trim() ? [`Motivo: ${reason.trim()}`] : [];
}

export function describeVehicleAudit(action: string, metadata: unknown): VehicleAuditView {
  const data = asRecord(metadata);

  switch (action) {
    case "VEHICLE_CREATED": {
      const details: string[] = [];
      if (typeof data?.plate === "string") {
        details.push(`Placa ${formatVehicleFieldValue("plate", data.plate)}`);
      }
      const extras = [
        data?.category ? formatVehicleFieldValue("category", data.category) : null,
        data?.usageType ? formatVehicleFieldValue("usageType", data.usageType) : null,
      ].filter(Boolean);
      if (extras.length) details.push(extras.join(" · "));
      return { title: "Veículo cadastrado", details, tone: "success" };
    }
    case "VEHICLE_UPDATED": {
      const details = describeChanges(data);
      return {
        title: "Dados do veículo atualizados",
        details: details.length ? details : ["Nenhum campo foi alterado."],
        tone: "info",
      };
    }
    case "VEHICLE_BLOCKED":
      return {
        title: "Veículo bloqueado",
        details: [
          `Status: ${statusLabel(data?.from)} → ${statusLabel(data?.to)}`,
          ...reasonLine(data),
        ],
        tone: "warning",
      };
    case "VEHICLE_UNBLOCKED":
      return {
        title: "Veículo desbloqueado",
        details: [
          `Status: ${statusLabel(data?.from)} → ${statusLabel(data?.to)}`,
          ...reasonLine(data),
        ],
        tone: "success",
      };
    case "VEHICLE_STATUS_CHANGED":
      return {
        title: "Status alterado",
        details: [`${statusLabel(data?.from)} → ${statusLabel(data?.to)}`, ...reasonLine(data)],
        tone: "info",
      };
    default:
      // Ação nova ainda sem tradução: mostra um título neutro em vez do código.
      return { title: "Registro do sistema", details: [], tone: "neutral" };
  }
}
