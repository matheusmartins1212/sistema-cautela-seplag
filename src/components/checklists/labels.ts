import type {
  ChecklistAnswer,
  ChecklistStatus,
  ChecklistType,
  CleanlinessLevel,
  FuelCardStatus,
  FuelLevel,
} from "@prisma/client";

export const CHECKLIST_TYPE_LABEL: Record<ChecklistType, string> = {
  RETIRADA: "Saída",
  DEVOLUCAO: "Retorno",
};

export const CHECKLIST_STATUS_LABEL: Record<ChecklistStatus, string> = {
  PENDENTE: "Pendente",
  EM_PREENCHIMENTO: "Em preenchimento",
  ENVIADO: "Enviado",
  EM_ANALISE: "Em análise",
  APROVADO: "Aprovado",
  RETIFICADO: "Retificação solicitada",
  CANCELADO: "Cancelado",
};

export const FUEL_LEVEL_LABEL: Record<FuelLevel, string> = {
  CHEIO: "Cheio",
  TRES_QUARTOS: "3/4",
  MEIO: "1/2",
  UM_QUARTO: "1/4",
  RESERVA: "Reserva",
  VAZIO: "Vazio",
};

export const FUEL_CARD_LABEL: Record<FuelCardStatus, string> = {
  PRESENTE: "Presente",
  AUSENTE: "Ausente",
  NAO_SE_APLICA: "Não se aplica",
};

export const CLEANLINESS_LABEL: Record<CleanlinessLevel, string> = {
  LIMPO: "Limpo",
  REGULAR: "Regular",
  SUJO: "Sujo",
};

export const ANSWER_LABEL: Record<ChecklistAnswer, string> = {
  BOM: "Bom",
  RUIM: "Ruim",
  AUSENTE: "Ausente",
  NAO_SE_APLICA: "Não se aplica",
};

export const ITEM_GROUP_LABEL: Record<string, string> = {
  VIDROS: "Vidros",
  ILUMINACAO: "Iluminação",
  NIVEIS: "Níveis",
  ESPELHOS: "Espelhos",
  CARROCERIA: "Carroceria",
  PNEUS: "Pneus",
  ACESSORIOS: "Acessórios",
  DOCUMENTOS: "Documentos",
  LIMPEZA: "Limpeza",
  ESPECIFICO: "Específicos do veículo",
};
