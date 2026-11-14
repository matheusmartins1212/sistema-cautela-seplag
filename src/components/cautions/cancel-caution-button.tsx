"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiPost } from "@/lib/api-client";

interface Props {
  cautionId: string;
  publicCode: string;
  // Veículo já retirado (em uso, aguardando devolução, atrasado...).
  vehicleOut?: boolean;
  // "link" para a coluna de ações da lista; "button" para o detalhe.
  appearance?: "button" | "link";
}

export function CancelCautionButton({
  cautionId,
  publicCode,
  vehicleOut = false,
  appearance = "button",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setReason("");
    setError(null);
  }

  async function submit() {
    if (reason.trim().length < 3) {
      setError("Informe o motivo do cancelamento.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await apiPost(`/api/admin/cautions/${cautionId}/cancel`, {
      reason,
    });
    setLoading(false);
    if (result.ok) {
      close();
      router.refresh();
      return;
    }
    setError(result.error.message);
  }

  return (
    <>
      {appearance === "link" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-medium text-danger hover:underline"
        >
          Cancelar
        </button>
      ) : (
        <Button variant="danger" onClick={() => setOpen(true)}>
          Cancelar viagem
        </Button>
      )}

      <ConfirmDialog
        open={open}
        title={`Cancelar a viagem ${publicCode}?`}
        tone="danger"
        confirmLabel="Confirmar cancelamento"
        loading={loading}
        onConfirm={submit}
        onCancel={close}
        description={
          <div className="space-y-3">
            {vehicleOut ? (
              <p>
                O veículo <strong>já foi retirado</strong>. Ao cancelar, ele fica livre para novas
                viagens no sistema, então confirme antes que ele já voltou ao pátio.
              </p>
            ) : (
              <p>
                A reserva é desfeita e o veículo fica <strong>livre</strong> para outras viagens.
              </p>
            )}
            <p>O solicitante é avisado e a ação fica registrada na auditoria.</p>
            <Textarea
              label="Motivo do cancelamento"
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              required
            />
            {error && <Alert tone="error">{error}</Alert>}
          </div>
        }
      />
    </>
  );
}
