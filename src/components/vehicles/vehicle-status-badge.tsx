import type { VehicleStatus } from "@prisma/client";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { VEHICLE_STATUS_LABEL } from "./labels";

const TONES: Record<VehicleStatus, BadgeTone> = {
  DISPONIVEL: "success",
  RESERVADO: "info",
  AGUARDANDO_RETIRADA: "info",
  EM_USO: "warning",
  AGUARDANDO_DEVOLUCAO: "warning",
  DEVOLVIDO: "info",
  EM_ANALISE: "info",
  BLOQUEADO: "danger",
  EM_MANUTENCAO: "warning",
  BAIXADO: "muted",
  INATIVO: "muted",
};

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  return <Badge tone={TONES[status]}>{VEHICLE_STATUS_LABEL[status]}</Badge>;
}
