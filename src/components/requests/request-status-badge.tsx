import type { RequestStatus } from "@prisma/client";
import { cn } from "@/lib/cn";
import { REQUEST_STATUS_LABEL } from "./labels";

const TONES: Record<RequestStatus, string> = {
  PENDENTE_ANALISE: "bg-info/10 text-info border-info/30",
  APROVADA: "bg-success/10 text-success border-success/30",
  NAO_APROVADA: "bg-danger/10 text-danger border-danger/30",
  CANCELADA_PELO_USUARIO: "bg-gray-100 text-gray-600 border-gray-300",
  CANCELADA_PELO_ADMIN: "bg-gray-200 text-gray-700 border-gray-400",
  AJUSTE_SOLICITADO: "bg-warning/10 text-warning border-warning/30",
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONES[status],
      )}
    >
      {REQUEST_STATUS_LABEL[status]}
    </span>
  );
}
