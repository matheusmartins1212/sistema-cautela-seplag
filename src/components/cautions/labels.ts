import type { CautionStatus } from "@prisma/client";

export const CAUTION_STATUS_LABEL: Record<CautionStatus, string> = {
  AGUARDANDO_RETIRADA: "Aguardando saída",
  RETIRADA_EM_ANDAMENTO: "Saída em andamento",
  EM_USO: "Em viagem",
  AGUARDANDO_DEVOLUCAO: "Aguardando retorno",
  DEVOLUCAO_EM_ANALISE: "Retorno em análise",
  FINALIZADA: "Finalizada",
  FINALIZADA_COM_OBSERVACAO: "Finalizada com observação",
  CANCELADA: "Cancelada",
  ATRASADA: "Atrasada",
};
