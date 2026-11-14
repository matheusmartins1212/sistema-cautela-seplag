import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  errors?: string[];
  hint?: string;
}

/** Campo de formulário acessível: label + input + mensagem de erro. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, errors, hint, id, className, required, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hasError = !!errors && errors.length > 0;

    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
          {required && (
            <span aria-hidden="true" className="ml-0.5 text-danger">
              *
            </span>
          )}
        </label>
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          className={cn(
            "block h-11 w-full rounded-md border bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400",
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
Field.displayName = "Field";
