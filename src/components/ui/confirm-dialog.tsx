"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Esconde o botão de voltar (ESC e clique fora continuam fechando). */
  hideCancel?: boolean;
  tone?: "primary" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal de confirmação para ações sensíveis (aprovar, recusar, bloquear, etc.).
 * Fecha no ESC e no clique fora; o botão de confirmar reflete o tom da ação.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Voltar",
  hideCancel = false,
  tone = "primary",
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !loading && onCancel()}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-card border border-gray-200 bg-white p-5 shadow-lg">
        <h2 className="text-base font-semibold text-institutional-900">{title}</h2>
        {description && <div className="mt-2 text-sm text-gray-600">{description}</div>}
        <div className="mt-5 flex justify-end gap-2">
          {!hideCancel && (
            <Button variant="secondary" onClick={onCancel} disabled={loading}>
              {cancelLabel}
            </Button>
          )}
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
