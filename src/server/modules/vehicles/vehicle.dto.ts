import type { Vehicle, VehicleCategory, VehicleStatus, VehicleUsageType } from "@prisma/client";
import { formatPlate } from "@/shared/validation/plate";

/**
 * Representação pública de veículo. `notes` é considerado campo administrativo
 * e só é exposto via `toPublicVehicle(vehicle, { includeNotes: true })` em
 * contextos confirmados como admin.
 */
export interface PublicVehicle {
  id: string;
  brand: string;
  model: string;
  plate: string;
  plateFormatted: string;
  internalCode: string | null;
  category: VehicleCategory;
  usageType: VehicleUsageType;
  linkedSector: string | null;
  agency: string | null;
  currentStatus: VehicleStatus;
  currentMileage: number;
  active: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toPublicVehicle(
  vehicle: Vehicle,
  options?: { includeNotes?: boolean },
): PublicVehicle {
  const base: PublicVehicle = {
    id: vehicle.id,
    brand: vehicle.brand,
    model: vehicle.model,
    plate: vehicle.plate,
    plateFormatted: formatPlate(vehicle.plate),
    internalCode: vehicle.internalCode,
    category: vehicle.category,
    usageType: vehicle.usageType,
    linkedSector: vehicle.linkedSector,
    agency: vehicle.agency,
    currentStatus: vehicle.currentStatus,
    currentMileage: vehicle.currentMileage,
    active: vehicle.active,
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
  };

  if (options?.includeNotes) {
    base.notes = vehicle.notes;
  }

  return base;
}
