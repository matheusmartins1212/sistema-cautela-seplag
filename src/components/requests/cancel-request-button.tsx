"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { apiPost } from "@/lib/api-client";

interface Props {
  requestId: string;
  endpoint?: string; // p/ admin: /api/admin/requests/[id]/cancel
}

export function CancelRequestButton({
  requestId,
  endpoint = `/api/requests/${requestId}/cancel`,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const result = await apiPost(endpoint, {
      cancellationReason: reason || null,
    });
    setLoading(false);
    if (result.ok) {
      setOpen(false);
      router.refresh();
      return;
    }
    setError(result.error.message);
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Cancelar solicitação
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-card border border-danger/30 bg-danger/5 p-4">
      <p className="text-sm text-gray-700">
        Deseja realmente cancelar esta solicitação? Você pode informar o motivo para registro.
      </p>
      <Textarea
        label="Motivo do cancelamento (opcional)"
        name="reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
      />
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            setOpen(false);
            setReason("");
            setError(null);
          }}
          disabled={loading}
        >
          Voltar
        </Button>
        <Button onClick={submit} loading={loading}>
          Confirmar cancelamento
        </Button>
      </div>
    </div>
  );
}
