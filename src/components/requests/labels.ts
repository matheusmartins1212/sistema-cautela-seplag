import type { RequestStatus, Shift } from "@prisma/client";

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  PENDENTE_ANALISE: "Pendente de análise",
  APROVADA: "Aprovada",
  NAO_APROVADA: "Não aprovada",
  CANCELADA_PELO_USUARIO: "Cancelada pelo usuário",
  CANCELADA_PELO_ADMIN: "Cancelada pelo administrador",
  AJUSTE_SOLICITADO: "Ajuste solicitado",
};

export const SHIFT_LABEL: Record<Shift, string> = {
  MATUTINO: "Matutino",
  VESPERTINO: "Vespertino",
  INTEGRAL: "Integral",
};
