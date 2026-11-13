"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { apiPost } from "@/lib/api-client";

interface Props {
  checklistId: string;
}

type Mode = "approve" | "rectify" | null;

export function ReviewChecklistPanel({ checklistId }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setMode(null);
    setNotes("");
    setError(null);
  }

  async function submit(decision: "APPROVE" | "REQUEST_RECTIFICATION") {
    setLoading(true);
    setError(null);
    const r = await apiPost(`/api/admin/checklists/${checklistId}/review`, {
      decision,
      reviewNotes: notes || null,
    });
    setLoading(false);
    if (r.ok) {
      reset();
      router.refresh();
      return;
    }
    setError(r.error.message);
  }

  if (mode === null) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setMode("approve")}>Aprovar checklist</Button>
        <Button variant="secondary" onClick={() => setMode("rectify")}>
          Solicitar retificação
        </Button>
      </div>
    );
  }

  return (
    <div
      className={
        mode === "approve"
          ? "space-y-3 rounded-card border border-success/30 bg-success/5 p-4"
          : "space-y-3 rounded-card border border-danger/30 bg-danger/5 p-4"
      }
    >
      <p className="text-sm font-medium text-gray-800">
        {mode === "approve"
          ? "Aprovar este checklist. Se for o checklist de devolução, a cautela será finalizada e o veículo voltará a DISPONIVEL."
          : "Solicitar retificação do checklist. O usuário poderá ajustar e reenviar."}
      </p>
      <Textarea
        label="Observação (opcional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
      />
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={reset} disabled={loading}>
          Voltar
        </Button>
        <Button
          loading={loading}
          onClick={() => submit(mode === "approve" ? "APPROVE" : "REQUEST_RECTIFICATION")}
        >
          Confirmar
        </Button>
      </div>
    </div>
  );
}
