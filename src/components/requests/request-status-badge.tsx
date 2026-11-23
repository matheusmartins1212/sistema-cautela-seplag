import type { RequestStatus } from "@prisma/client";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { REQUEST_STATUS_LABEL } from "./labels";

const TONES: Record<RequestStatus, BadgeTone> = {
  PENDENTE_ANALISE: "info",
  APROVADA: "success",
  NAO_APROVADA: "danger",
  CANCELADA_PELO_USUARIO: "muted",
  CANCELADA_PELO_ADMIN: "muted",
  AJUSTE_SOLICITADO: "warning",
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <Badge tone={TONES[status]}>{REQUEST_STATUS_LABEL[status]}</Badge>;
}
