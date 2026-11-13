import type { CautionStatus } from "@prisma/client";
import { cn } from "@/lib/cn";
import { CAUTION_STATUS_LABEL } from "./labels";

const TONES: Record<CautionStatus, string> = {
  AGUARDANDO_RETIRADA: "bg-info/10 text-info border-info/30",
  RETIRADA_EM_ANDAMENTO: "bg-info/10 text-info border-info/30",
  EM_USO: "bg-warning/10 text-warning border-warning/30",
  AGUARDANDO_DEVOLUCAO: "bg-warning/10 text-warning border-warning/30",
  DEVOLUCAO_EM_ANALISE: "bg-warning/10 text-warning border-warning/30",
  FINALIZADA: "bg-success/10 text-success border-success/30",
  FINALIZADA_COM_OBSERVACAO: "bg-success/10 text-success border-success/30",
  CANCELADA: "bg-gray-200 text-gray-700 border-gray-300",
  ATRASADA: "bg-danger/10 text-danger border-danger/30",
};

export function CautionStatusBadge({ status }: { status: CautionStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONES[status],
      )}
    >
      {CAUTION_STATUS_LABEL[status]}
    </span>
  );
}
