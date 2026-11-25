import Link from "next/link";
import { notFound } from "next/navigation";
import type { VehicleCategory, VehicleUsageType } from "@prisma/client";
import { getVehicleById, listVehicleCautions } from "@/server/modules/vehicles/vehicle.service";
import { toPublicVehicle } from "@/server/modules/vehicles/vehicle.dto";
import { Errors } from "@/server/lib/errors";
import { VehicleStatusBadge } from "@/components/vehicles/vehicle-status-badge";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { VehicleStatusActions } from "@/components/vehicles/vehicle-status-actions";
import { VEHICLE_CATEGORY_LABEL, VEHICLE_USAGE_LABEL } from "@/components/vehicles/labels";
import { CautionStatusBadge } from "@/components/cautions/caution-status-badge";
import { Badge } from "@/components/ui/badge";
import {
  DetailCard,
  DetailHeader,
  DetailLayout,
  Fact,
  Facts,
  RelatedItem,
  RelatedList,
  secondaryLinkClass,
} from "@/components/ui/detail";
import { currentYearCuiaba, formatKm, formatWallClockPeriod, shortCode } from "@/shared/format";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VeiculoDetalhePage({ params, searchParams }: Props) {
  const { id } = await params;
  const editing = (await searchParams).editar === "1";

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
  const cautions = await listVehicleCautions(id, 10);
  const year = currentYearCuiaba();
  const basePath = `/admin/veiculos/${vehicle.id}`;

  return (
    <div className="space-y-6">
      <DetailHeader
        backHref="/admin/veiculos"
        backLabel="Veículos"
        title={`${vehicle.brand} ${vehicle.model}`}
        code={vehicle.plateFormatted}
        badges={
          <>
            <VehicleStatusBadge status={vehicle.currentStatus} />
            {!vehicle.active && <Badge tone="muted">Inativo</Badge>}
          </>
        }
        meta={[
          VEHICLE_CATEGORY_LABEL[vehicle.category as VehicleCategory],
          VEHICLE_USAGE_LABEL[vehicle.usageType as VehicleUsageType],
          formatKm(vehicle.currentMileage),
        ].join(" · ")}
        actions={
          !editing && (
            <Link href={`${basePath}?editar=1`} className={secondaryLinkClass}>
              Editar
            </Link>
          )
        }
      />

      <DetailLayout
        main={
          <>
            {editing ? (
              <DetailCard title="Editar veículo" tone="highlight">
                <VehicleForm mode="edit" initial={vehicle} cancelHref={basePath} />
              </DetailCard>
            ) : (
              <DetailCard title="Dados do veículo">
                <Facts>
                  <Fact label="Código interno">{vehicle.internalCode || "—"}</Fact>
                  <Fact label="Quilometragem">{formatKm(vehicle.currentMileage)}</Fact>
                  <Fact label="Setor vinculado">{vehicle.linkedSector || "—"}</Fact>
                  <Fact label="Órgão / Agência">{vehicle.agency || "—"}</Fact>
                  {vehicle.notes && (
                    <Fact label="Observações administrativas" wide>
                      {vehicle.notes}
                    </Fact>
                  )}
                </Facts>
              </DetailCard>
            )}

            <DetailCard
              title="Viagens deste veículo"
              action={
                cautions.length > 0 && (
                  <Link
                    href={`/admin/cautelas?search=${encodeURIComponent(vehicleData.plate)}`}
                    className="font-medium text-institutional-700 hover:underline"
                  >
                    Ver todas
                  </Link>
                )
              }
            >
              {cautions.length === 0 ? (
                <p className="text-sm text-gray-500">Este veículo ainda não teve viagens.</p>
              ) : (
                <RelatedList>
                  {cautions.map((c) => (
                    <RelatedItem
                      key={c.id}
                      label={formatWallClockPeriod(c.plannedWithdrawalAt, c.plannedReturnAt, year)}
                      title={c.userName}
                      detail={<span className="font-mono">{shortCode(c.publicCode)}</span>}
                      badge={<CautionStatusBadge status={c.status} />}
                      href={`/admin/cautelas/${c.id}`}
                    />
                  ))}
                </RelatedList>
              )}
            </DetailCard>
          </>
        }
        aside={
          <DetailCard
            title="Status administrativo"
            description="Reservado, em uso e aguardando retorno mudam sozinhos com as viagens."
          >
            <VehicleStatusActions vehicleId={vehicle.id} currentStatus={vehicle.currentStatus} />
          </DetailCard>
        }
      />
    </div>
  );
}
