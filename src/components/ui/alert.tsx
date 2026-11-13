import { cn } from "@/lib/cn";

type Tone = "error" | "success" | "info" | "warning";

const TONES: Record<Tone, string> = {
  error: "bg-danger/10 text-danger border-danger/30",
  success: "bg-success/10 text-success border-success/30",
  info: "bg-info/10 text-info border-info/30",
  warning: "bg-warning/10 text-warning border-warning/30",
};

export function Alert({ tone = "info", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-md border px-3 py-2.5 text-sm", TONES[tone])}
    >
      {children}
    </div>
  );
}
