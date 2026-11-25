"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiPost } from "@/lib/api-client";

interface Props {
  requestId: string;
  endpoint?: string; // p/ admin: /api/admin/requests/[id]/cancel
}

/** Botão do cabeçalho: abre a confirmação com motivo opcional. */
export function CancelRequestButton({
  requestId,
  endpoint = `/api/requests/${requestId}/cancel`,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (loading) return;
    setOpen(false);
    setReason("");
    setError(null);
  }

  async function submit() {
    setLoading(true);
    setError(null);
    const result = await apiPost(endpoint, {
      cancellationReason: reason || null,
    });
    setLoading(false);
    if (result.ok) {
      setOpen(false);
      setReason("");
      router.refresh();
      return;
    }
    setError(result.error.message);
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Cancelar solicitação
      </Button>
      <ConfirmDialog
        open={open}
        title="Cancelar esta solicitação?"
        tone="danger"
        confirmLabel="Confirmar cancelamento"
        loading={loading}
        onConfirm={submit}
        onCancel={close}
        description={
          <div className="space-y-3">
            <p>
              O pedido sai da fila da central. Se precisar do veículo depois, faça um novo pedido.
            </p>
            <Textarea
              label="Motivo do cancelamento (opcional)"
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
            {error && <Alert tone="error">{error}</Alert>}
          </div>
        }
      />
    </>
  );
}
