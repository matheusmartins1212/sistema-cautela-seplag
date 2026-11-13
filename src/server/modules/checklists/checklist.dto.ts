import type {
  Checklist,
  ChecklistAnswer,
  ChecklistItem,
  ChecklistStatus,
  ChecklistType,
  CleanlinessLevel,
  FuelCardStatus,
  FuelLevel,
} from "@prisma/client";

/** Item público com label do template, agrupamento e flag de foto. */
export interface PublicChecklistItem {
  id: string;
  itemKey: string;
  itemLabel: string;
  category: string | null;
  answer: ChecklistAnswer | null;
  observation: string | null;
  requiresPhoto: boolean;
}

export interface PublicChecklist {
  id: string;
  cautionId: string;
  vehicleId: string;
  userId: string;
  type: ChecklistType;
  status: ChecklistStatus;
  realDate: string | null;
  realTime: string | null;
  mileage: number | null;
  fuelLevel: FuelLevel | null;
  fuelCardStatus: FuelCardStatus | null;
  internalCleanliness: CleanlinessLevel | null;
  externalCleanliness: CleanlinessLevel | null;
  parkingLocation: string | null;
  hasChangesFromInitial: boolean | null;
  changesDescription: string | null;
  hasDamage: boolean | null;
  damageDescription: string | null;
  generalNotes: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
  items: PublicChecklistItem[];
}

type ChecklistWithItems = Checklist & { items?: ChecklistItem[] };

function toIsoDateOnly(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

export function toPublicChecklist(checklist: ChecklistWithItems): PublicChecklist {
  return {
    id: checklist.id,
    cautionId: checklist.cautionId,
    vehicleId: checklist.vehicleId,
    userId: checklist.userId,
    type: checklist.type,
    status: checklist.status,
    realDate: toIsoDateOnly(checklist.realDate),
    realTime: checklist.realTime,
    mileage: checklist.mileage,
    fuelLevel: checklist.fuelLevel,
    fuelCardStatus: checklist.fuelCardStatus,
    internalCleanliness: checklist.internalCleanliness,
    externalCleanliness: checklist.externalCleanliness,
    parkingLocation: checklist.parkingLocation,
    hasChangesFromInitial: checklist.hasChangesFromInitial,
    changesDescription: checklist.changesDescription,
    hasDamage: checklist.hasDamage,
    damageDescription: checklist.damageDescription,
    generalNotes: checklist.generalNotes,
    submittedAt: checklist.submittedAt?.toISOString() ?? null,
    reviewedAt: checklist.reviewedAt?.toISOString() ?? null,
    reviewedByAdminId: checklist.reviewedByAdminId,
    createdAt: checklist.createdAt.toISOString(),
    updatedAt: checklist.updatedAt.toISOString(),
    items: (checklist.items ?? []).map((it) => ({
      id: it.id,
      itemKey: it.itemKey,
      itemLabel: it.itemLabel,
      category: it.category,
      answer: it.answer,
      observation: it.observation,
      requiresPhoto: it.requiresPhoto,
    })),
  };
}
