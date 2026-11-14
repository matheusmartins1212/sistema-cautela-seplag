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
          Pedir correção
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
          ? "Aprovar este checklist. Se for o de devolução, a cautela é finalizada e o veículo fica livre para novas cautelas."
          : "Pedir correção ao servidor. Ele recebe um aviso, ajusta o checklist e envia de novo."}
      </p>
      <Textarea
        label={mode === "approve" ? "Observação (opcional)" : "O que precisa ser corrigido"}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        required={mode === "rectify"}
        hint={mode === "rectify" ? "O servidor verá este texto ao abrir o checklist." : undefined}
      />
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={reset} disabled={loading}>
          Voltar
        </Button>
        <Button
          loading={loading}
          disabled={mode === "rectify" && notes.trim().length < 3}
          onClick={() => submit(mode === "approve" ? "APPROVE" : "REQUEST_RECTIFICATION")}
        >
          Confirmar
        </Button>
      </div>
    </div>
  );
}
