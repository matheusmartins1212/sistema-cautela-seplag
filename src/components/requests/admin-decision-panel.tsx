"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { VehicleCategory, VehicleStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiPost } from "@/lib/api-client";
import { VEHICLE_CATEGORY_LABEL } from "@/components/vehicles/labels";

interface VehicleOption {
  id: string;
  brand: string;
  model: string;
  plate: string;
  plateFormatted: string;
  category: VehicleCategory;
  currentStatus: VehicleStatus;
  /** Cautela que ocupa o veículo no período pedido; se houver, não dá para escolher. */
  conflictCode: string | null;
}

function optionNote(v: VehicleOption): string {
  if (v.conflictCode) return ` · ocupado no período (${v.conflictCode})`;
  if (v.currentStatus !== "DISPONIVEL") return " · tem viagem em outra data";
  return "";
}

interface DriverOption {
  id: string;
  fullName: string;
  phone: string;
  driverLicenseCategory: string | null;
  /** Viagem que ocupa o condutor no período; se houver, não dá para escolher. */
  conflictCode: string | null;
  licenseExpired: boolean;
}

function driverNote(d: DriverOption): string {
  if (d.licenseExpired) return " · CNH vencida para esta data";
  if (d.conflictCode) return ` · ocupado no período (${d.conflictCode})`;
  return "";
}

interface Props {
  requestId: string;
  availableVehicles: VehicleOption[];
  availableDrivers: DriverOption[];
  passengerCount: number | null;
  /** O solicitante pediu condutor? Se não, o condutor é opcional. */
  withDriver: boolean;
}

/** Valor do seletor para "sem condutor: o próprio solicitante dirige". */
const NO_DRIVER = "__sem_condutor__";

type Mode = "approve" | "reject" | "cancel" | null;

export function AdminDecisionPanel({
  requestId,
  availableVehicles,
  availableDrivers,
  passengerCount,
  withDriver,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [vehicleId, setVehicleId] = useState("");
  const initialDriver = withDriver ? "" : NO_DRIVER;
  const [driverId, setDriverId] = useState(initialDriver);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function reset() {
    setMode(null);
    setVehicleId("");
    setDriverId(initialDriver);
    setAdminNotes("");
    setRejectionReason("");
    setCancellationReason("");
    setError(null);
    setConfirming(false);
  }

  const selectedVehicle = availableVehicles.find((v) => v.id === vehicleId);
  const selectedDriver = availableDrivers.find((d) => d.id === driverId);
  const noDriver = driverId === NO_DRIVER;
  const canApprove = vehicleId !== "" && driverId !== "";
  const missingMessage = withDriver ? "Selecione o veículo e o condutor." : "Selecione o veículo.";

  function askApprove() {
    if (!canApprove) {
      setError(missingMessage);
      return;
    }
    setError(null);
    setConfirming(true);
  }

  function askReject() {
    if (rejectionReason.trim().length < 3) {
      setError("Informe o motivo da recusa (mínimo 3 caracteres).");
      return;
    }
    setError(null);
    setConfirming(true);
  }

  async function submitApprove() {
    if (!canApprove) {
      setError(missingMessage);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await apiPost(`/api/admin/requests/${requestId}/approve`, {
      vehicleId,
      driverId: noDriver ? null : driverId,
      adminNotes: adminNotes || null,
    });
    setLoading(false);
    if (result.ok) {
      reset();
      router.refresh();
      return;
    }
    setConfirming(false);
    setError(result.error.message);
  }

  async function submitReject() {
    if (rejectionReason.trim().length < 3) {
      setError("Informe o motivo da recusa (mínimo 3 caracteres).");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await apiPost(`/api/admin/requests/${requestId}/reject`, {
      rejectionReason,
      adminNotes: adminNotes || null,
    });
    setLoading(false);
    if (result.ok) {
      reset();
      router.refresh();
      return;
    }
    setConfirming(false);
    setError(result.error.message);
  }

  async function submitCancel() {
    setLoading(true);
    setError(null);
    const result = await apiPost(`/api/admin/requests/${requestId}/cancel`, {
      cancellationReason: cancellationReason || null,
    });
    setLoading(false);
    if (result.ok) {
      reset();
      router.refresh();
      return;
    }
    setError(result.error.message);
  }

  if (mode === null) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setMode("approve")}>Aprovar</Button>
        <Button variant="secondary" onClick={() => setMode("reject")}>
          Recusar
        </Button>
        <Button variant="ghost" onClick={() => setMode("cancel")}>
          Cancelar solicitação
        </Button>
      </div>
    );
  }

  if (mode === "approve") {
    return (
      <div className="space-y-3 rounded-card border border-success/30 bg-success/5 p-4">
        <p className="text-sm font-medium text-gray-800">
          {withDriver ? "Aprovar e definir veículo e condutor" : "Aprovar e definir o veículo"}
          {!withDriver && (
            <span className="font-normal text-gray-600"> · o solicitante pediu para dirigir</span>
          )}
          {passengerCount !== null && (
            <span className="font-normal text-gray-600"> · {passengerCount} passageiro(s)</span>
          )}
        </p>
        <Select
          label="Veículo"
          name="vehicleId"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          required
        >
          <option value="" disabled>
            Selecione um veículo…
          </option>
          {availableVehicles.length === 0 && (
            <option disabled>Nenhum veículo ativo na frota.</option>
          )}
          {availableVehicles.map((v) => (
            <option key={v.id} value={v.id} disabled={v.conflictCode !== null}>
              {v.brand} {v.model} · {v.plateFormatted} · {VEHICLE_CATEGORY_LABEL[v.category]}
              {optionNote(v)}
            </option>
          ))}
        </Select>
        {availableVehicles.length > 0 && availableVehicles.every((v) => v.conflictCode) && (
          <Alert tone="warning">
            Todos os veículos já estão ocupados nesse período. Recuse a solicitação ou combine outra
            data com o solicitante.
          </Alert>
        )}
        <Select
          label="Condutor"
          name="driverId"
          value={driverId}
          onChange={(e) => setDriverId(e.target.value)}
          required
        >
          {withDriver ? (
            <option value="" disabled>
              Selecione um condutor…
            </option>
          ) : (
            <option value={NO_DRIVER}>Sem condutor: o próprio solicitante dirige</option>
          )}
          {availableDrivers.length === 0 && (
            <option disabled>Nenhum condutor habilitado. Cadastre em Condutores.</option>
          )}
          {availableDrivers.map((d) => (
            <option key={d.id} value={d.id} disabled={d.conflictCode !== null || d.licenseExpired}>
              {d.fullName}
              {d.driverLicenseCategory ? ` · CNH ${d.driverLicenseCategory}` : ""}
              {driverNote(d)}
            </option>
          ))}
        </Select>
        {withDriver &&
          availableDrivers.length > 0 &&
          availableDrivers.every((d) => d.conflictCode !== null || d.licenseExpired) && (
            <Alert tone="warning">
              Nenhum condutor livre nesse período. Recuse a solicitação ou combine outro horário com
              o solicitante.
            </Alert>
          )}
        <Textarea
          label="Observação administrativa (opcional)"
          name="adminNotes"
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={2}
        />
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={reset} disabled={loading}>
            Voltar
          </Button>
          <Button onClick={askApprove} disabled={!canApprove}>
            Confirmar aprovação
          </Button>
        </div>
        <ConfirmDialog
          open={confirming}
          title="Confirmar aprovação?"
          description={
            <>
              O veículo{" "}
              <strong>
                {selectedVehicle
                  ? `${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.plateFormatted})`
                  : ""}
              </strong>{" "}
              {noDriver ? (
                <>
                  fica com o próprio solicitante, que retira, dirige e preenche os checklists. Ele
                  será avisado por e-mail.
                </>
              ) : (
                <>
                  sai com o condutor <strong>{selectedDriver?.fullName ?? ""}</strong>. A viagem
                  será criada e o solicitante e o condutor serão avisados por e-mail.
                </>
              )}
            </>
          }
          confirmLabel="Aprovar"
          loading={loading}
          onConfirm={submitApprove}
          onCancel={() => setConfirming(false)}
        />
      </div>
    );
  }

  if (mode === "reject") {
    return (
      <div className="space-y-3 rounded-card border border-danger/30 bg-danger/5 p-4">
        <p className="text-sm font-medium text-gray-800">Recusar a solicitação</p>
        <Textarea
          label="Motivo da recusa"
          name="rejectionReason"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          rows={3}
          required
          hint="Será informado ao solicitante por e-mail e exibido no detalhe."
        />
        <Textarea
          label="Observação interna (opcional)"
          name="adminNotes"
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={2}
        />
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={reset} disabled={loading}>
            Voltar
          </Button>
          <Button variant="danger" onClick={askReject} disabled={rejectionReason.trim().length < 3}>
            Confirmar recusa
          </Button>
        </div>
        <ConfirmDialog
          open={confirming}
          title="Confirmar recusa?"
          description="A solicitação será recusada e o solicitante notificado por e-mail com o motivo informado."
          confirmLabel="Recusar"
          tone="danger"
          loading={loading}
          onConfirm={submitReject}
          onCancel={() => setConfirming(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-card border border-gray-300 bg-gray-50 p-4">
      <p className="text-sm font-medium text-gray-800">
        Cancelar a solicitação (uso administrativo)
      </p>
      <Textarea
        label="Motivo (opcional)"
        name="cancellationReason"
        value={cancellationReason}
        onChange={(e) => setCancellationReason(e.target.value)}
        rows={2}
      />
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={reset} disabled={loading}>
          Voltar
        </Button>
        <Button onClick={submitCancel} loading={loading}>
          Confirmar cancelamento
        </Button>
      </div>
    </div>
  );
}
