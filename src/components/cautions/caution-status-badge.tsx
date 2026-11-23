import type { CautionStatus } from "@prisma/client";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { CAUTION_STATUS_LABEL } from "./labels";

const TONES: Record<CautionStatus, BadgeTone> = {
  AGUARDANDO_RETIRADA: "info",
  RETIRADA_EM_ANDAMENTO: "info",
  EM_USO: "warning",
  AGUARDANDO_DEVOLUCAO: "warning",
  DEVOLUCAO_EM_ANALISE: "warning",
  FINALIZADA: "success",
  FINALIZADA_COM_OBSERVACAO: "success",
  CANCELADA: "muted",
  ATRASADA: "danger",
};

export function CautionStatusBadge({ status }: { status: CautionStatus }) {
  return <Badge tone={TONES[status]}>{CAUTION_STATUS_LABEL[status]}</Badge>;
}
