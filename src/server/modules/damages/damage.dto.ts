import type { DamageReport, DamageSeverity, DamageStatus, Vehicle } from "@prisma/client";
import { formatPlate } from "@/shared/validation/plate";

export interface PublicDamageReport {
  id: string;
  vehicleId: string;
  cautionId: string | null;
  checklistId: string | null;
  description: string;
  severity: DamageSeverity;
  status: DamageStatus;
  createdByUserId: string;
  reviewedByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle?: {
    id: string;
    brand: string;
    model: string;
    plate: string;
    plateFormatted: string;
  };
}

export function toPublicDamage(
  damage: DamageReport & { vehicle?: Vehicle },
  options?: { includeVehicle?: boolean },
): PublicDamageReport {
  const base: PublicDamageReport = {
    id: damage.id,
    vehicleId: damage.vehicleId,
    cautionId: damage.cautionId,
    checklistId: damage.checklistId,
    description: damage.description,
    severity: damage.severity,
    status: damage.status,
    createdByUserId: damage.createdByUserId,
    reviewedByAdminId: damage.reviewedByAdminId,
    createdAt: damage.createdAt.toISOString(),
    updatedAt: damage.updatedAt.toISOString(),
  };
  if (options?.includeVehicle && damage.vehicle) {
    base.vehicle = {
      id: damage.vehicle.id,
      brand: damage.vehicle.brand,
      model: damage.vehicle.model,
      plate: damage.vehicle.plate,
      plateFormatted: formatPlate(damage.vehicle.plate),
    };
  }
  return base;
}
