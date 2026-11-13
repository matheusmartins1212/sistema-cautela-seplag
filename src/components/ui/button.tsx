import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-institutional-800 text-white hover:bg-institutional-700 disabled:bg-institutional-300",
  secondary:
    "bg-white text-institutional-800 border border-institutional-200 hover:bg-institutional-50",
  ghost: "bg-transparent text-institutional-700 hover:bg-institutional-50",
  danger: "bg-danger text-white hover:bg-danger/90 disabled:bg-danger/40",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", loading, disabled, className, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed",
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {loading && (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
