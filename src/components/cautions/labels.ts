import type { CautionStatus } from "@prisma/client";

export const CAUTION_STATUS_LABEL: Record<CautionStatus, string> = {
  AGUARDANDO_RETIRADA: "Aguardando retirada",
  RETIRADA_EM_ANDAMENTO: "Retirada em andamento",
  EM_USO: "Em uso",
  AGUARDANDO_DEVOLUCAO: "Aguardando devolução",
  DEVOLUCAO_EM_ANALISE: "Devolução em análise",
  FINALIZADA: "Finalizada",
  FINALIZADA_COM_OBSERVACAO: "Finalizada com observação",
  CANCELADA: "Cancelada",
  ATRASADA: "Atrasada",
};
