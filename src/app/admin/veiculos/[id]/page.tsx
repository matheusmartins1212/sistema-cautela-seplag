import Link from "next/link";
import { notFound } from "next/navigation";
import type { VehicleCategory, VehicleUsageType } from "@prisma/client";
import { getVehicleById, getVehicleHistory } from "@/server/modules/vehicles/vehicle.service";
import { toPublicVehicle } from "@/server/modules/vehicles/vehicle.dto";
import { Errors } from "@/server/lib/errors";
import { VehicleStatusBadge } from "@/components/vehicles/vehicle-status-badge";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { VehicleStatusActions } from "@/components/vehicles/vehicle-status-actions";
import { VEHICLE_CATEGORY_LABEL, VEHICLE_USAGE_LABEL } from "@/components/vehicles/labels";
import { formatInstantBr } from "@/shared/time";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function VeiculoDetalhePage({ params }: Props) {
  const { id } = await params;

  let vehicleData;
  try {
    vehicleData = await getVehicleById(id);
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === Errors.notFound().code) notFound();
    }
    throw error;
  }
  const vehicle = toPublicVehicle(vehicleData, { includeNotes: true });
  const history = await getVehicleHistory(id, 30);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/veiculos" className="text-sm text-institutional-700 hover:underline">
          ← Veículos
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-institutional-900">{vehicle.model}</h1>
          <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-sm font-semibold text-gray-800">
            {vehicle.plateFormatted}
          </span>
          <VehicleStatusBadge status={vehicle.currentStatus} />
        </div>
        <p className="mt-1 text-sm text-gray-600">
          {vehicle.brand} · {VEHICLE_CATEGORY_LABEL[vehicle.category as VehicleCategory]} ·{" "}
          {VEHICLE_USAGE_LABEL[vehicle.usageType as VehicleUsageType]}
          {!vehicle.active && (
            <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-xs font-medium text-gray-700">
              Inativo
            </span>
          )}
        </p>
      </div>

      <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
          Editar veículo
        </h2>
        <VehicleForm mode="edit" initial={vehicle} />
      </section>

      <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-600">
          Status administrativo
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          Estados de ciclo (em uso, reservado, etc.) são controlados automaticamente pelo fluxo de
          cautelas — não podem ser alterados manualmente.
        </p>
        <VehicleStatusActions vehicleId={vehicle.id} currentStatus={vehicle.currentStatus} />
      </section>

      <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
          Histórico de auditoria
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum evento registrado ainda.</p>
        ) : (
          <ol className="space-y-3">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="rounded-md border border-gray-100 bg-gray-50 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium text-institutional-800">
                    {entry.action}
                  </span>
                  <time className="text-xs text-gray-500">{formatInstantBr(entry.createdAt)}</time>
                </div>
                {entry.metadata && typeof entry.metadata === "object" && (
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs text-gray-700">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
