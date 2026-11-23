"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { VehicleStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "@/lib/api-client";
import { VEHICLE_STATUS_LABEL } from "./labels";

interface Props {
  vehicleId: string;
  currentStatus: VehicleStatus;
}

const ADMIN_TARGETS: VehicleStatus[] = [
  "DISPONIVEL",
  "BLOQUEADO",
  "EM_MANUTENCAO",
  "INATIVO",
  "BAIXADO",
];

const WORKFLOW: VehicleStatus[] = [
  "RESERVADO",
  "AGUARDANDO_RETIRADA",
  "EM_USO",
  "AGUARDANDO_DEVOLUCAO",
  "DEVOLVIDO",
  "EM_ANALISE",
];

export function VehicleStatusActions({ vehicleId, currentStatus }: Props) {
  const router = useRouter();
  const [target, setTarget] = useState<VehicleStatus | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inWorkflow = WORKFLOW.includes(currentStatus);
  const availableTargets = ADMIN_TARGETS.filter((s) => s !== currentStatus);

  async function submit() {
    if (!target) return;
    setLoading(true);
    setError(null);
    const result = await apiPost(`/api/admin/vehicles/${vehicleId}/status`, {
      targetStatus: target,
      reason,
    });
    setLoading(false);
    if (result.ok) {
      setTarget(null);
      setReason("");
      router.refresh();
      return;
    }
    setError(result.error.message);
  }

  if (inWorkflow) {
    return (
      <Alert tone="warning">
        Este veículo está em viagem ({VEHICLE_STATUS_LABEL[currentStatus]}). O status só voltará a
        ser administrável quando a viagem for finalizada.
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {availableTargets.map((s) => (
          <Button
            key={s}
            type="button"
            variant={target === s ? "primary" : "secondary"}
            onClick={() => setTarget(s)}
            disabled={loading}
          >
            {VEHICLE_STATUS_LABEL[s]}
          </Button>
        ))}
      </div>

      {target && (
        <div className="space-y-3 rounded-card border border-institutional-200 bg-institutional-50 p-4">
          <p className="text-sm text-institutional-900">
            Alterar status para <strong>{VEHICLE_STATUS_LABEL[target]}</strong>. Informe o motivo
            (registrado em auditoria).
          </p>
          <Textarea
            label="Motivo"
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            required
          />
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setTarget(null);
                setReason("");
                setError(null);
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              loading={loading}
              onClick={submit}
              disabled={reason.trim().length < 3}
            >
              Confirmar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
