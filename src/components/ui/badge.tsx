import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "muted" | "info" | "success" | "warning" | "danger";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-gray-100 text-gray-700 ring-gray-500/15",
  muted: "bg-gray-50 text-gray-500 ring-gray-400/15",
  info: "bg-blue-50 text-blue-700 ring-blue-600/15",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  warning: "bg-amber-50 text-amber-800 ring-amber-600/20",
  danger: "bg-red-50 text-red-700 ring-red-600/15",
};

const DOTS: Record<BadgeTone, string> = {
  neutral: "bg-gray-400",
  muted: "bg-gray-300",
  info: "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};

/**
 * Selo de situação usado em todas as listas: uma linha só, com ponto de cor.
 * Os selos de status de cada módulo só escolhem o tom e o texto.
 */
export function Badge({
  tone = "neutral",
  dot = true,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONES[tone],
      )}
    >
      {dot && <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", DOTS[tone])} />}
      {children}
    </span>
  );
}
