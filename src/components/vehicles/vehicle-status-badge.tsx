import type { VehicleStatus } from "@prisma/client";
import { cn } from "@/lib/cn";
import { VEHICLE_STATUS_LABEL } from "./labels";

const TONES: Record<VehicleStatus, string> = {
  DISPONIVEL: "bg-success/10 text-success border-success/30",
  RESERVADO: "bg-info/10 text-info border-info/30",
  AGUARDANDO_RETIRADA: "bg-info/10 text-info border-info/30",
  EM_USO: "bg-warning/10 text-warning border-warning/30",
  AGUARDANDO_DEVOLUCAO: "bg-warning/10 text-warning border-warning/30",
  DEVOLVIDO: "bg-info/10 text-info border-info/30",
  EM_ANALISE: "bg-info/10 text-info border-info/30",
  BLOQUEADO: "bg-danger/10 text-danger border-danger/30",
  EM_MANUTENCAO: "bg-warning/10 text-warning border-warning/30",
  BAIXADO: "bg-gray-200 text-gray-700 border-gray-300",
  INATIVO: "bg-gray-100 text-gray-600 border-gray-300",
};

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONES[status],
      )}
    >
      {VEHICLE_STATUS_LABEL[status]}
    </span>
  );
}
