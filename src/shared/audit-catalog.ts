import type { AuditAction } from "@prisma/client";

/**
 * Nomes em português das ações registradas na auditoria e o resumo de cada
 * registro para o histórico de ações. Puro (sem banco), para ser testado e
 * usado tanto no servidor quanto na tela.
 */

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  LOGIN: "Entrou no sistema",
  LOGIN_FAILED: "Tentativa de login recusada",
  LOGOUT: "Saiu do sistema",
  REGISTER: "Cadastro de conta",
  EMAIL_CONFIRMED: "E-mail confirmado",
  PASSWORD_RESET_REQUESTED: "Pediu recuperação de senha",
  PASSWORD_RESET_COMPLETED: "Redefiniu a senha",
  PASSWORD_TEMPORARY_SET: "Gerou senha provisória",
  UNAUTHORIZED_ACCESS_ATTEMPT: "Acesso negado",
  USER_ACTIVATED: "Conta liberada",
  USER_DEACTIVATED: "Conta bloqueada",
  USER_ROLE_CHANGED: "Perfil de acesso alterado",
  USER_DRIVER_UPDATED: "Perfil de condutor alterado",
  REQUEST_CREATED: "Solicitação criada",
  REQUEST_APPROVED: "Solicitação aprovada",
  REQUEST_REJECTED: "Solicitação recusada",
  REQUEST_CANCELLED: "Solicitação cancelada",
  REQUEST_ADJUSTMENT_REQUESTED: "Ajuste pedido na solicitação",
  CAUTION_FINALIZED: "Viagem encerrada",
  CAUTION_CANCELLED: "Viagem cancelada",
  STATUS_CHANGED: "Situação alterada",
  CHECKLIST_STARTED: "Checklist iniciado",
  CHECKLIST_SUBMITTED: "Checklist enviado",
  CHECKLIST_REVIEWED: "Checklist aprovado",
  CHECKLIST_RECTIFIED: "Correção pedida no checklist",
  PHOTO_UPLOADED: "Foto enviada",
  VEHICLE_CREATED: "Veículo cadastrado",
  VEHICLE_UPDATED: "Veículo editado",
  VEHICLE_STATUS_CHANGED: "Situação do veículo alterada",
  VEHICLE_BLOCKED: "Veículo bloqueado",
  VEHICLE_UNBLOCKED: "Veículo desbloqueado",
  AGENCY_CREATED: "Órgão incluído",
  AGENCY_UPDATED: "Órgão ativado ou desativado",
  AGENCY_DELETED: "Órgão removido",
};

export interface AuditGroup {
  key: string;
  label: string;
  actions: AuditAction[];
}

/** Grupos usados no filtro do histórico. Cobrem todas as ações. */
export const AUDIT_GROUPS: AuditGroup[] = [
  {
    key: "acesso",
    label: "Acesso e senha",
    actions: [
      "LOGIN",
      "LOGIN_FAILED",
      "LOGOUT",
      "REGISTER",
      "EMAIL_CONFIRMED",
      "PASSWORD_RESET_REQUESTED",
      "PASSWORD_RESET_COMPLETED",
      "UNAUTHORIZED_ACCESS_ATTEMPT",
    ],
  },
  {
    key: "contas",
    label: "Contas",
    actions: [
      "USER_ACTIVATED",
      "USER_DEACTIVATED",
      "USER_ROLE_CHANGED",
      "USER_DRIVER_UPDATED",
      "PASSWORD_TEMPORARY_SET",
    ],
  },
  {
    key: "solicitacoes",
    label: "Solicitações",
    actions: [
      "REQUEST_CREATED",
      "REQUEST_APPROVED",
      "REQUEST_REJECTED",
      "REQUEST_CANCELLED",
      "REQUEST_ADJUSTMENT_REQUESTED",
    ],
  },
  {
    key: "viagens",
    label: "Viagens e checklists",
    actions: [
      "CAUTION_FINALIZED",
      "CAUTION_CANCELLED",
      "STATUS_CHANGED",
      "CHECKLIST_STARTED",
      "CHECKLIST_SUBMITTED",
      "CHECKLIST_REVIEWED",
      "CHECKLIST_RECTIFIED",
      "PHOTO_UPLOADED",
    ],
  },
  {
    key: "veiculos",
    label: "Veículos",
    actions: [
      "VEHICLE_CREATED",
      "VEHICLE_UPDATED",
      "VEHICLE_STATUS_CHANGED",
      "VEHICLE_BLOCKED",
      "VEHICLE_UNBLOCKED",
    ],
  },
  {
    key: "orgaos",
    label: "Órgãos",
    actions: ["AGENCY_CREATED", "AGENCY_UPDATED", "AGENCY_DELETED"],
  },
];

export function auditGroupOf(action: AuditAction): AuditGroup | undefined {
  return AUDIT_GROUPS.find((g) => g.actions.includes(action));
}

const ROLE_LABEL: Record<string, string> = {
  USER: "Usuário",
  ADMIN: "Administrador",
  SUPER_ADMIN: "Super administrador",
};

const CHECKLIST_LABEL: Record<string, string> = {
  RETIRADA: "saída",
  DEVOLUCAO: "retorno",
};

const VEHICLE_FIELD_LABEL: Record<string, string> = {
  brand: "marca",
  model: "modelo",
  plate: "placa",
  internalCode: "código interno",
  category: "categoria",
  usageType: "tipo de uso",
  linkedSector: "setor",
  agency: "órgão",
  currentMileage: "quilometragem",
  notes: "observações",
  active: "ativo",
};

type Meta = Record<string, unknown>;

function text(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function count(n: unknown, one: string, many: string): string | null {
  return typeof n === "number" && n > 0 ? `${n} ${n === 1 ? one : many}` : null;
}

/** Resumo do registro em uma frase curta (vazio quando não há o que somar). */
export function describeAudit(action: AuditAction, rawMetadata: unknown): string {
  const m: Meta =
    rawMetadata && typeof rawMetadata === "object" && !Array.isArray(rawMetadata)
      ? (rawMetadata as Meta)
      : {};
  const name = text(m.name);
  const reason = text(m.reason);

  switch (action) {
    case "AGENCY_CREATED":
      return [name, text(m.source) ? `(${text(m.source)})` : null].filter(Boolean).join(" ");
    case "AGENCY_UPDATED":
      return `${m.to === true ? "Reativou" : "Desativou"}${name ? `: ${name}` : ""}`;
    case "AGENCY_DELETED": {
      const uses = [
        count(m.usersWithAgency, "conta", "contas"),
        count(m.requestsWithAgency, "solicitação", "solicitações"),
      ].filter(Boolean);
      return `${name ?? "Órgão"}${uses.length > 0 ? ` (ainda citado em ${uses.join(" e ")})` : ""}`;
    }
    case "USER_ROLE_CHANGED":
      return `${ROLE_LABEL[String(m.from)] ?? m.from} → ${ROLE_LABEL[String(m.to)] ?? m.to}`;
    case "USER_ACTIVATED":
    case "USER_DEACTIVATED":
      return [m.manualEmailConfirmation ? "Cadastro confirmado manualmente" : null, reason]
        .filter(Boolean)
        .join(". ");
    case "USER_DRIVER_UPDATED":
      return m.to === true
        ? `Habilitado como condutor${text(m.licenseCategory) ? `, CNH ${text(m.licenseCategory)}` : ""}`
        : m.from === true
          ? "Deixou de ser condutor"
          : "Dados de condutor atualizados";
    case "LOGIN_FAILED":
      return "E-mail ou senha incorretos";
    case "PASSWORD_RESET_REQUESTED":
      return m.channel === "central" ? "Pedido feito à central" : "Link pedido por e-mail";
    case "PASSWORD_RESET_COMPLETED":
      return m.via === "temporary" ? "Trocou a senha provisória" : "";
    case "PASSWORD_TEMPORARY_SET":
      return m.requested ? "A pedido da pessoa" : "";
    case "REGISTER":
      return m.event === "resend_confirmation" ? "Reenvio do e-mail de confirmação" : "";
    case "REQUEST_APPROVED": {
      const plate = text(m.vehiclePlate);
      return [plate ? `Veículo ${plate}` : null, m.withDriver ? "com condutor" : "sem condutor"]
        .filter(Boolean)
        .join(", ");
    }
    case "REQUEST_REJECTED":
      return reason ? `Motivo: ${reason}` : "";
    case "REQUEST_CANCELLED":
      return m.by === "admin" ? "Pela central" : m.by === "user" ? "Pelo solicitante" : "";
    case "CAUTION_CANCELLED":
    case "VEHICLE_STATUS_CHANGED":
    case "VEHICLE_BLOCKED":
    case "VEHICLE_UNBLOCKED":
      return reason ? `Motivo: ${reason}` : "";
    case "CHECKLIST_STARTED":
    case "CHECKLIST_SUBMITTED":
    case "CHECKLIST_REVIEWED":
    case "CHECKLIST_RECTIFIED": {
      const kind = CHECKLIST_LABEL[String(m.type)];
      const extra = action === "CHECKLIST_SUBMITTED" && m.resubmission ? ", reenviado" : "";
      return kind ? `Checklist de ${kind}${extra}` : "";
    }
    case "VEHICLE_UPDATED": {
      const changes = m.changes && typeof m.changes === "object" ? Object.keys(m.changes) : [];
      return changes.length > 0
        ? `Alterou ${changes.map((k) => VEHICLE_FIELD_LABEL[k] ?? k).join(", ")}`
        : "";
    }
    case "STATUS_CHANGED":
      if (m.event === "overdue_detected") return "Viagem marcada como atrasada";
      if (m.event === "damage_created") return "Avaria registrada";
      if (m.event === "damage_updated") return "Avaria atualizada";
      return "";
    default:
      return "";
  }
}
