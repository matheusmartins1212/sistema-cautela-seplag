"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DamageSeverity, DamageStatus } from "@prisma/client";
import { apiPatch } from "@/lib/api-client";
import { DAMAGE_STATUS_LABEL, SEVERITY_LABEL } from "./labels";

const STATUSES: DamageStatus[] = ["ABERTA", "EM_ANALISE", "RESOLVIDA", "IMPROCEDENTE"];
const SEVERITIES: DamageSeverity[] = ["LEVE", "MODERADA", "GRAVE"];

/** Edição rápida de status e severidade de uma avaria, direto na lista. */
export function DamageActions({
  damageId,
  status,
  severity,
}: {
  damageId: string;
  status: DamageStatus;
  severity: DamageSeverity;
}) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState(status);
  const [nextSeverity, setNextSeverity] = useState(severity);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = nextStatus !== status || nextSeverity !== severity;

  async function save() {
    setSaving(true);
    setError(null);
    const result = await apiPatch(`/api/admin/damages/${damageId}`, {
      status: nextStatus,
      severity: nextSeverity,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          aria-label="Status da avaria"
          value={nextStatus}
          onChange={(e) => setNextStatus(e.target.value as DamageStatus)}
          className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {DAMAGE_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          aria-label="Severidade da avaria"
          value={nextSeverity}
          onChange={(e) => setNextSeverity(e.target.value as DamageSeverity)}
          className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs"
        >
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABEL[s]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="h-8 rounded-md bg-institutional-800 px-3 text-xs font-semibold text-white hover:bg-institutional-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
