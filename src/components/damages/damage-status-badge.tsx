import type { DamageStatus } from "@prisma/client";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { DAMAGE_STATUS_LABEL } from "./labels";

const TONES: Record<DamageStatus, BadgeTone> = {
  ABERTA: "warning",
  EM_ANALISE: "info",
  RESOLVIDA: "success",
  IMPROCEDENTE: "muted",
};

export function DamageStatusBadge({ status }: { status: DamageStatus }) {
  return <Badge tone={TONES[status]}>{DAMAGE_STATUS_LABEL[status]}</Badge>;
}
