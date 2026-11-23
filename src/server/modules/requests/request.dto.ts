import type { Caution, RequestStatus, Shift, User, Vehicle, VehicleRequest } from "@prisma/client";
import { formatPlate } from "@/shared/validation/plate";

/**
 * Representação pública de uma solicitação. Inclui opcionalmente dados do
 * solicitante (admin) e do veículo aprovado (após aprovação).
 */
export interface PublicVehicleRequest {
  id: string;
  publicCode: string;
  userId: string;
  withdrawalDate: string; // ISO yyyy-mm-dd
  returnDate: string;
  shift: Shift;
  withdrawalTime: string; // HH:mm
  returnTime: string;
  origin: string | null;
  destination: string;
  reason: string;
  passengerCount: number | null;
  passengerNames: string | null;
  contactPhone: string | null;
  requestingAgency: string | null;
  termNumber: string | null;
  status: RequestStatus;
  rejectionReason: string | null;
  adminNotes: string | null;
  adminId: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;

  // Composições opcionais
  user?: {
    id: string;
    fullName: string;
    registrationNumber: string;
    email: string;
    phone: string;
    sector: string;
    department: string;
    agency: string | null;
  };
  caution?: {
    id: string;
    publicCode: string;
    status: string;
    vehicle?: {
      id: string;
      plate: string;
      plateFormatted: string;
      model: string;
      brand: string;
    };
    driver?: {
      id: string;
      fullName: string;
      phone: string;
    } | null;
  } | null;
}

type RequestWithRelations = VehicleRequest & {
  user?: User;
  caution?: (Caution & { vehicle?: Vehicle; driver?: User | null }) | null;
};

function toDateOnly(date: Date): string {
  // Em prisma o campo é @db.Date; quando consultado vem como Date com 00:00 UTC.
  // Preservamos a parte de data como UTC.
  return date.toISOString().slice(0, 10);
}

export function toPublicRequest(
  req: RequestWithRelations,
  options?: { includeUser?: boolean; includeCaution?: boolean },
): PublicVehicleRequest {
  const base: PublicVehicleRequest = {
    id: req.id,
    publicCode: req.publicCode,
    userId: req.userId,
    withdrawalDate: toDateOnly(req.withdrawalDate),
    returnDate: toDateOnly(req.returnDate),
    shift: req.shift,
    withdrawalTime: req.withdrawalTime,
    returnTime: req.returnTime,
    origin: req.origin,
    destination: req.destination,
    reason: req.reason,
    passengerCount: req.passengerCount,
    passengerNames: req.passengerNames,
    contactPhone: req.contactPhone,
    requestingAgency: req.requestingAgency,
    termNumber: req.termNumber,
    status: req.status,
    rejectionReason: req.rejectionReason,
    adminNotes: req.adminNotes,
    adminId: req.adminId,
    decidedAt: req.decidedAt?.toISOString() ?? null,
    createdAt: req.createdAt.toISOString(),
    updatedAt: req.updatedAt.toISOString(),
  };

  if (options?.includeUser && req.user) {
    base.user = {
      id: req.user.id,
      fullName: req.user.fullName,
      registrationNumber: req.user.registrationNumber,
      email: req.user.email,
      phone: req.user.phone,
      sector: req.user.sector,
      department: req.user.department,
      agency: req.user.agency,
    };
  }

  if (options?.includeCaution) {
    if (req.caution) {
      base.caution = {
        id: req.caution.id,
        publicCode: req.caution.publicCode,
        status: req.caution.status,
        vehicle: req.caution.vehicle
          ? {
              id: req.caution.vehicle.id,
              plate: req.caution.vehicle.plate,
              plateFormatted: formatPlate(req.caution.vehicle.plate),
              model: req.caution.vehicle.model,
              brand: req.caution.vehicle.brand,
            }
          : undefined,
        driver: req.caution.driver
          ? {
              id: req.caution.driver.id,
              fullName: req.caution.driver.fullName,
              phone: req.caution.driver.phone,
            }
          : null,
      };
    } else {
      base.caution = null;
    }
  }

  return base;
}
