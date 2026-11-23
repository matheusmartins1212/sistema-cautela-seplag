import type { UserStatus } from "@prisma/client";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { USER_STATUS_LABEL } from "./labels";

const TONES: Record<UserStatus, BadgeTone> = {
  PENDING_EMAIL_VERIFICATION: "warning",
  ACTIVE: "success",
  BLOCKED: "danger",
  INACTIVE: "muted",
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <Badge tone={TONES[status]}>{USER_STATUS_LABEL[status]}</Badge>;
}
