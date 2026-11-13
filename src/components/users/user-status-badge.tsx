import type { UserStatus } from "@prisma/client";
import { cn } from "@/lib/cn";
import { USER_STATUS_LABEL } from "./labels";

const TONES: Record<UserStatus, string> = {
  PENDING_EMAIL_VERIFICATION: "bg-warning/10 text-warning border-warning/30",
  ACTIVE: "bg-success/10 text-success border-success/30",
  BLOCKED: "bg-danger/10 text-danger border-danger/30",
  INACTIVE: "bg-gray-200 text-gray-700 border-gray-300",
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONES[status],
      )}
    >
      {USER_STATUS_LABEL[status]}
    </span>
  );
}
