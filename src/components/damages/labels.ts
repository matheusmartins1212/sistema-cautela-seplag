import type { DamageSeverity, DamageStatus } from "@prisma/client";

export const SEVERITY_LABEL: Record<DamageSeverity, string> = {
  LEVE: "Leve",
  MODERADA: "Moderada",
  GRAVE: "Grave",
};

export const DAMAGE_STATUS_LABEL: Record<DamageStatus, string> = {
  ABERTA: "Aberta",
  EM_ANALISE: "Em análise",
  RESOLVIDA: "Resolvida",
  IMPROCEDENTE: "Improcedente",
};
