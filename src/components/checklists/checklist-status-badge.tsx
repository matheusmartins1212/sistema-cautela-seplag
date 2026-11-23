import type { ChecklistStatus } from "@prisma/client";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { CHECKLIST_STATUS_LABEL } from "./labels";

const TONES: Record<ChecklistStatus, BadgeTone> = {
  PENDENTE: "neutral",
  EM_PREENCHIMENTO: "info",
  ENVIADO: "warning",
  EM_ANALISE: "warning",
  APROVADO: "success",
  RETIFICADO: "danger",
  CANCELADO: "muted",
};

export function ChecklistStatusBadge({ status }: { status: ChecklistStatus }) {
  return <Badge tone={TONES[status]}>{CHECKLIST_STATUS_LABEL[status]}</Badge>;
}
