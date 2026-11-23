import Link from "next/link";
import { notFound } from "next/navigation";
import type { VehicleCategory, VehicleUsageType } from "@prisma/client";
import {
  getVehicleById,
  getVehicleHistory,
  listVehicleCautions,
} from "@/server/modules/vehicles/vehicle.service";
import { toPublicVehicle } from "@/server/modules/vehicles/vehicle.dto";
import { Errors } from "@/server/lib/errors";
import { VehicleStatusBadge } from "@/components/vehicles/vehicle-status-badge";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { VehicleStatusActions } from "@/components/vehicles/vehicle-status-actions";
import { VEHICLE_CATEGORY_LABEL, VEHICLE_USAGE_LABEL } from "@/components/vehicles/labels";
import { CautionStatusBadge } from "@/components/cautions/caution-status-badge";
import { describeVehicleAudit, type VehicleAuditTone } from "@/components/vehicles/vehicle-audit";
import { formatInstantBr, formatWallClockBr } from "@/shared/time";
import { cn } from "@/lib/cn";

const TONE_DOT: Record<VehicleAuditTone, string> = {
  neutral: "bg-gray-400",
  info: "bg-institutional-500",
  warning: "bg-warning",
  success: "bg-success",
};

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
  const [history, cautions] = await Promise.all([
    getVehicleHistory(id, 30),
    listVehicleCautions(id, 15),
  ]);

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
          Os estados de ciclo (reservado, em uso, aguardando retorno) mudam sozinhos conforme as
          viagens avançam. Aqui você só bloqueia, coloca em manutenção, inativa ou dá baixa.
        </p>
        <VehicleStatusActions vehicleId={vehicle.id} currentStatus={vehicle.currentStatus} />
      </section>

      <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
            Viagens deste veículo
          </h2>
          {cautions.length > 0 && (
            <Link
              href={`/admin/cautelas?search=${encodeURIComponent(vehicleData.plate)}`}
              className="text-sm font-medium text-institutional-700 hover:underline"
            >
              Ver todas
            </Link>
          )}
        </div>
        {cautions.length === 0 ? (
          <p className="text-sm text-gray-500">Este veículo ainda não teve viagens.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {cautions.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/cautelas/${c.id}`}
                  className="-mx-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md px-2 py-3 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-institutional-900">
                        {c.publicCode}
                      </span>
                      <span className="truncate text-sm font-medium text-gray-900">
                        {c.userName}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {formatWallClockBr(c.plannedWithdrawalAt)} até{" "}
                      {formatWallClockBr(c.plannedReturnAt)}
                    </div>
                  </div>
                  <CautionStatusBadge status={c.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-600">
          Histórico do cadastro
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          Quem cadastrou, editou ou mudou o status administrativo deste veículo, e quando.
        </p>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum evento registrado ainda.</p>
        ) : (
          <ol className="relative space-y-5 border-l border-gray-200 pl-5">
            {history.map((entry) => {
              const view = describeVehicleAudit(entry.action, entry.metadata);
              return (
                <li key={entry.id} className="relative text-sm">
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -left-[1.6875rem] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white",
                      TONE_DOT[view.tone],
                    )}
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="font-medium text-gray-900">{view.title}</span>
                    <time dateTime={entry.createdAt} className="text-xs text-gray-500">
                      {formatInstantBr(entry.createdAt)}
                    </time>
                  </div>
                  <div className="text-xs text-gray-500">por {entry.actorName ?? "Sistema"}</div>
                  {view.details.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 text-gray-700">
                      {view.details.map((line, index) => (
                        <li key={index} className="break-words">
                          {line}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
