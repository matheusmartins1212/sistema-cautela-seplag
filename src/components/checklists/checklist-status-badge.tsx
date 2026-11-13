import type { ChecklistStatus } from "@prisma/client";
import { cn } from "@/lib/cn";
import { CHECKLIST_STATUS_LABEL } from "./labels";

const TONES: Record<ChecklistStatus, string> = {
  PENDENTE: "bg-gray-100 text-gray-700 border-gray-300",
  EM_PREENCHIMENTO: "bg-info/10 text-info border-info/30",
  ENVIADO: "bg-warning/10 text-warning border-warning/30",
  EM_ANALISE: "bg-warning/10 text-warning border-warning/30",
  APROVADO: "bg-success/10 text-success border-success/30",
  RETIFICADO: "bg-danger/10 text-danger border-danger/30",
  CANCELADO: "bg-gray-200 text-gray-700 border-gray-400",
};

export function ChecklistStatusBadge({ status }: { status: ChecklistStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONES[status],
      )}
    >
      {CHECKLIST_STATUS_LABEL[status]}
    </span>
  );
}
