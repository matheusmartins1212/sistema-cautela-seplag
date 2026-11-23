"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DamageSeverity, DamageStatus } from "@prisma/client";
import { apiPatch } from "@/lib/api-client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Alert } from "@/components/ui/alert";
import { DAMAGE_STATUS_LABEL, SEVERITY_LABEL } from "./labels";

const STATUSES: DamageStatus[] = ["ABERTA", "EM_ANALISE", "RESOLVIDA", "IMPROCEDENTE"];
const SEVERITIES: DamageSeverity[] = ["LEVE", "MODERADA", "GRAVE"];

const selectClass =
  "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-institutional-500 focus:outline-none focus:ring-2 focus:ring-institutional-500/20";

/**
 * Atualização de uma avaria: um botão na linha abre a janela com a descrição
 * completa, os links do checklist e da viagem, e os campos de status e
 * severidade. A lista fica limpa, sem formulário em cada linha.
 */
export function DamageActions({
  damageId,
  status,
  severity,
  description,
  vehicleLabel,
  checklistId,
  cautionId,
}: {
  damageId: string;
  status: DamageStatus;
  severity: DamageSeverity;
  description: string;
  vehicleLabel: string;
  checklistId: string | null;
  cautionId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState(status);
  const [nextSeverity, setNextSeverity] = useState(severity);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setNextStatus(status);
    setNextSeverity(severity);
    setError(null);
    setOpen(true);
  }

  async function save() {
    if (nextStatus === status && nextSeverity === severity) {
      setOpen(false);
      return;
    }
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
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex h-7 items-center rounded-md border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 transition-colors hover:border-institutional-300 hover:text-institutional-800"
      >
        Atualizar
      </button>
      <ConfirmDialog
        open={open}
        title="Atualizar avaria"
        confirmLabel="Salvar"
        loading={saving}
        onCancel={() => setOpen(false)}
        onConfirm={save}
        description={
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {vehicleLabel}
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-gray-800">{description}</p>
              {(checklistId || cautionId) && (
                <div className="mt-2 flex gap-4 text-sm">
                  {cautionId && (
                    <Link
                      href={`/admin/cautelas/${cautionId}`}
                      className="font-medium text-institutional-700 hover:underline"
                    >
                      Ver viagem
                    </Link>
                  )}
                  {checklistId && (
                    <Link
                      href={`/admin/checklists/${checklistId}`}
                      className="font-medium text-institutional-700 hover:underline"
                    >
                      Ver checklist
                    </Link>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-gray-600">Status</span>
                <select
                  aria-label="Status da avaria"
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as DamageStatus)}
                  className={selectClass}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {DAMAGE_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-gray-600">Severidade</span>
                <select
                  aria-label="Severidade da avaria"
                  value={nextSeverity}
                  onChange={(e) => setNextSeverity(e.target.value as DamageSeverity)}
                  className={selectClass}
                >
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {SEVERITY_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {error && <Alert tone="error">{error}</Alert>}
          </div>
        }
      />
    </>
  );
}
