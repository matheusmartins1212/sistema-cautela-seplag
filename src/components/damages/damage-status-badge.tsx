import type { DamageStatus } from "@prisma/client";
import { cn } from "@/lib/cn";
import { DAMAGE_STATUS_LABEL } from "./labels";

const TONES: Record<DamageStatus, string> = {
  ABERTA: "bg-warning/10 text-warning border-warning/30",
  EM_ANALISE: "bg-info/10 text-info border-info/30",
  RESOLVIDA: "bg-success/10 text-success border-success/30",
  IMPROCEDENTE: "bg-gray-100 text-gray-700 border-gray-300",
};

export function DamageStatusBadge({ status }: { status: DamageStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONES[status],
      )}
    >
      {DAMAGE_STATUS_LABEL[status]}
    </span>
  );
}
