import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  errors?: string[];
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, errors, hint, id, className, required, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hasError = !!errors && errors.length > 0;

    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
        <textarea
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          className={cn(
            "block min-h-[5rem] w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400",
            hasError ? "border-danger" : "border-gray-300",
            className,
          )}
          {...props}
        />
        {hint && !hasError && <p className="text-xs text-gray-500">{hint}</p>}
        {hasError && (
          <ul id={errorId} className="space-y-0.5">
            {errors!.map((e) => (
              <li key={e} className="text-xs text-danger">
                {e}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
