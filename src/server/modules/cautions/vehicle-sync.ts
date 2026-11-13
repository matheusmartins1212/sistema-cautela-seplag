import { CautionStatus, VehicleStatus, type Prisma } from "@prisma/client";
import { isWorkflowStatus } from "@/server/modules/vehicles/vehicle.schemas";

/**
 * Status do veículo derivado das cautelas ativas dele.
 *
 * Um mesmo carro pode ter várias cautelas ativas em períodos diferentes (ex.:
 * está em uso hoje e já tem reserva aprovada para a semana que vem). O status
 * do carro reflete a situação física mais "forte":
 *   fora do pátio > em conferência > reservado > disponível.
 */

// Carro fisicamente fora do pátio.
export const VEHICLE_OUT_CAUTION_STATUSES: readonly CautionStatus[] = [
  CautionStatus.EM_USO,
  CautionStatus.AGUARDANDO_DEVOLUCAO,
  CautionStatus.ATRASADA,
];

const ACTIVE_CAUTION_STATUSES: readonly CautionStatus[] = [
  CautionStatus.AGUARDANDO_RETIRADA,
  CautionStatus.RETIRADA_EM_ANDAMENTO,
  ...VEHICLE_OUT_CAUTION_STATUSES,
  CautionStatus.DEVOLUCAO_EM_ANALISE,
];

export function vehicleStatusForActiveCautions(statuses: readonly CautionStatus[]): VehicleStatus {
  if (statuses.some((s) => VEHICLE_OUT_CAUTION_STATUSES.includes(s))) {
    return VehicleStatus.EM_USO;
  }
  if (statuses.includes(CautionStatus.DEVOLUCAO_EM_ANALISE)) {
    return VehicleStatus.AGUARDANDO_DEVOLUCAO;
  }
  if (
    statuses.includes(CautionStatus.AGUARDANDO_RETIRADA) ||
    statuses.includes(CautionStatus.RETIRADA_EM_ANDAMENTO)
  ) {
    return VehicleStatus.RESERVADO;
  }
  return VehicleStatus.DISPONIVEL;
}

/**
 * Recalcula e grava o status do veículo a partir das cautelas ativas restantes.
 * Não mexe em veículos fora do fluxo (manutenção, bloqueado, baixado, inativo):
 * esses estados são do admin e o fluxo de cautelas não os sobrescreve.
 */
export async function syncVehicleStatus(
  tx: Prisma.TransactionClient,
  vehicle: { id: string; currentStatus: VehicleStatus },
): Promise<VehicleStatus> {
  if (
    vehicle.currentStatus !== VehicleStatus.DISPONIVEL &&
    !isWorkflowStatus(vehicle.currentStatus)
  ) {
    return vehicle.currentStatus;
  }
  const active = await tx.caution.findMany({
    where: { vehicleId: vehicle.id, status: { in: [...ACTIVE_CAUTION_STATUSES] } },
    select: { status: true },
  });
  const next = vehicleStatusForActiveCautions(active.map((c) => c.status));
  if (next !== vehicle.currentStatus) {
    await tx.vehicle.update({ where: { id: vehicle.id }, data: { currentStatus: next } });
  }
  return next;
}
