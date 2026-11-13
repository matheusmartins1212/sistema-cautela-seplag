import type { Caution, CautionStatus, User, Vehicle, VehicleRequest } from "@prisma/client";
import { formatPlate } from "@/shared/validation/plate";

export interface PublicCaution {
  id: string;
  publicCode: string;
  requestId: string;
  userId: string;
  vehicleId: string;
  status: CautionStatus;
  approvedByAdminId: string | null;
  plannedWithdrawalAt: string;
  plannedReturnAt: string;
  actualWithdrawalAt: string | null;
  actualReturnAt: string | null;
  finalNotes: string | null;
  createdAt: string;
  updatedAt: string;

  request?: {
    id: string;
    publicCode: string;
    destination: string;
    reason: string;
  };
  user?: {
    id: string;
    fullName: string;
    registrationNumber: string;
    email: string;
    phone: string;
    sector: string;
  };
  vehicle?: {
    id: string;
    brand: string;
    model: string;
    plate: string;
    plateFormatted: string;
    currentStatus: string;
  };
}

type CautionWithRelations = Caution & {
  request?: VehicleRequest;
  user?: User;
  vehicle?: Vehicle;
};

export function toPublicCaution(
  caution: CautionWithRelations,
  options?: {
    includeRequest?: boolean;
    includeUser?: boolean;
    includeVehicle?: boolean;
  },
): PublicCaution {
  const base: PublicCaution = {
    id: caution.id,
    publicCode: caution.publicCode,
    requestId: caution.requestId,
    userId: caution.userId,
    vehicleId: caution.vehicleId,
    status: caution.status,
    approvedByAdminId: caution.approvedByAdminId,
    plannedWithdrawalAt: caution.plannedWithdrawalAt.toISOString(),
    plannedReturnAt: caution.plannedReturnAt.toISOString(),
    actualWithdrawalAt: caution.actualWithdrawalAt?.toISOString() ?? null,
    actualReturnAt: caution.actualReturnAt?.toISOString() ?? null,
    finalNotes: caution.finalNotes,
    createdAt: caution.createdAt.toISOString(),
    updatedAt: caution.updatedAt.toISOString(),
  };

  if (options?.includeRequest && caution.request) {
    base.request = {
      id: caution.request.id,
      publicCode: caution.request.publicCode,
      destination: caution.request.destination,
      reason: caution.request.reason,
    };
  }
  if (options?.includeUser && caution.user) {
    base.user = {
      id: caution.user.id,
      fullName: caution.user.fullName,
      registrationNumber: caution.user.registrationNumber,
      email: caution.user.email,
      phone: caution.user.phone,
      sector: caution.user.sector,
    };
  }
  if (options?.includeVehicle && caution.vehicle) {
    base.vehicle = {
      id: caution.vehicle.id,
      brand: caution.vehicle.brand,
      model: caution.vehicle.model,
      plate: caution.vehicle.plate,
      plateFormatted: formatPlate(caution.vehicle.plate),
      currentStatus: caution.vehicle.currentStatus,
    };
  }

  return base;
}
