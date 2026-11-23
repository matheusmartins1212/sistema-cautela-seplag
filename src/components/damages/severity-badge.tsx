import type { DamageSeverity } from "@prisma/client";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { SEVERITY_LABEL } from "./labels";

const TONES: Record<DamageSeverity, BadgeTone> = {
  LEVE: "neutral",
  MODERADA: "warning",
  GRAVE: "danger",
};

export function SeverityBadge({ severity }: { severity: DamageSeverity }) {
  return <Badge tone={TONES[severity]}>{SEVERITY_LABEL[severity]}</Badge>;
}
