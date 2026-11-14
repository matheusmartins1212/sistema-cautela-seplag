"use client";

import { forwardRef, useId, useState } from "react";
import { cn } from "@/lib/cn";

interface PasswordFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  errors?: string[];
  hint?: string;
}

/**
 * Campo de senha acessível: botão para mostrar/ocultar e aviso de Caps Lock.
 * Mesmo visual e API do `Field`, sem o `type` (sempre senha).
 */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ label, errors, hint, id, className, required, onKeyDown, onKeyUp, onBlur, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const capsId = `${inputId}-caps`;
    const hasError = !!errors && errors.length > 0;

    const [visible, setVisible] = useState(false);
    const [capsLock, setCapsLock] = useState(false);

    function syncCapsLock(e: React.KeyboardEvent<HTMLInputElement>) {
      setCapsLock(e.getModifierState("CapsLock"));
    }

    const describedBy = [hasError ? errorId : null, capsLock ? capsId : null]
      .filter(Boolean)
      .join(" ");

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
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            required={required}
            aria-invalid={hasError}
            aria-describedby={describedBy || undefined}
            className={cn(
              "block h-11 w-full rounded-md border bg-white pl-3 pr-11 text-sm text-gray-900 placeholder:text-gray-400",
              hasError ? "border-danger" : "border-gray-300",
              className,
            )}
            onKeyDown={(e) => {
              syncCapsLock(e);
              onKeyDown?.(e);
            }}
            onKeyUp={(e) => {
              syncCapsLock(e);
              onKeyUp?.(e);
            }}
            onBlur={(e) => {
              setCapsLock(false);
              onBlur?.(e);
            }}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={visible}
            aria-controls={inputId}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-gray-500 hover:text-institutional-700"
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {capsLock && (
          <p id={capsId} role="status" className="text-xs font-medium text-warning">
            Caps Lock está ativado.
          </p>
        )}
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
PasswordField.displayName = "PasswordField";

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2" />
      <path d="M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </svg>
  );
}
