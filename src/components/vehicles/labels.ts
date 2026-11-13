import type { VehicleCategory, VehicleStatus, VehicleUsageType } from "@prisma/client";

export const VEHICLE_CATEGORY_LABEL: Record<VehicleCategory, string> = {
  PICKUP: "Pick-up",
  SUV: "SUV",
  HATCH: "Hatch",
};

export const VEHICLE_USAGE_LABEL: Record<VehicleUsageType, string> = {
  ADMINISTRATIVO: "Administrativo",
  OPERACIONAL: "Operacional",
};

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  DISPONIVEL: "Disponível",
  RESERVADO: "Reservado",
  AGUARDANDO_RETIRADA: "Aguardando retirada",
  EM_USO: "Em uso",
  AGUARDANDO_DEVOLUCAO: "Aguardando devolução",
  DEVOLVIDO: "Devolvido",
  EM_ANALISE: "Em análise",
  BLOQUEADO: "Bloqueado",
  EM_MANUTENCAO: "Em manutenção",
  BAIXADO: "Baixado",
  INATIVO: "Inativo",
};
