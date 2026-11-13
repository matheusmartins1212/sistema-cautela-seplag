import { z } from "zod";
import {
  ChecklistAnswer,
  ChecklistType,
  CleanlinessLevel,
  FuelCardStatus,
  FuelLevel,
} from "@prisma/client";

/**
 * Schemas Zod do módulo de checklists. O servidor é a fonte de verdade —
 * confiar no frontend para autoria, autenticidade e validade dos campos é
 * inadequado (seção 18).
 */

const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const isoDate = z.string().trim().regex(ISO_DATE_REGEX, "Use o formato AAAA-MM-DD.");

const time = z.string().trim().regex(HHMM_REGEX, "Use o formato HH:mm.");

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable();

export const checklistTypeParamSchema = z.string().toUpperCase().pipe(z.nativeEnum(ChecklistType));

const itemAnswerSchema = z.object({
  itemKey: z.string().trim().min(1).max(80),
  answer: z.nativeEnum(ChecklistAnswer),
  observation: optionalTrimmed(500).optional(),
});

/** Campos comuns ao salvar rascunho/envio. Mileage e horários obrigatórios no submit. */
const commonChecklistFields = z.object({
  realDate: isoDate.optional(),
  realTime: time.optional(),
  mileage: z.number().int().min(0).optional(),
  fuelLevel: z.nativeEnum(FuelLevel).optional(),
  fuelCardStatus: z.nativeEnum(FuelCardStatus).optional(),
  internalCleanliness: z.nativeEnum(CleanlinessLevel).optional(),
  externalCleanliness: z.nativeEnum(CleanlinessLevel).optional(),
  parkingLocation: optionalTrimmed(120).optional(),
  hasChangesFromInitial: z.boolean().optional(),
  changesDescription: optionalTrimmed(1000).optional(),
  hasDamage: z.boolean().optional(),
  damageDescription: optionalTrimmed(1000).optional(),
  generalNotes: optionalTrimmed(1000).optional(),
  items: z.array(itemAnswerSchema).max(200).optional(),
});

/** Rascunho — qualquer subconjunto, sem validações cruzadas. */
export const saveChecklistDraftSchema = commonChecklistFields;

/**
 * Envio — exige os campos críticos preenchidos e força observação quando algum
 * item está RUIM/AUSENTE. A exigência de FOTO (RUIM/AUSENTE e avaria) é validada
 * no serviço de envio (`submitChecklist`), pois depende das fotos já enviadas.
 */
export const submitChecklistSchema = commonChecklistFields
  .extend({
    realDate: isoDate,
    realTime: time,
    mileage: z.number().int().min(0, "Quilometragem não pode ser negativa."),
    fuelLevel: z.nativeEnum(FuelLevel),
    fuelCardStatus: z.nativeEnum(FuelCardStatus),
    internalCleanliness: z.nativeEnum(CleanlinessLevel),
    externalCleanliness: z.nativeEnum(CleanlinessLevel),
    items: z.array(itemAnswerSchema).min(1, "Responda os itens do checklist."),
  })
  .superRefine((data, ctx) => {
    data.items.forEach((item, idx) => {
      if (
        (item.answer === "RUIM" || item.answer === "AUSENTE") &&
        (!item.observation || item.observation.trim().length === 0)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", idx, "observation"],
          message: "Itens RUIM/AUSENTE exigem observação.",
        });
      }
    });
  });

export const reviewChecklistSchema = z.object({
  decision: z.enum(["APPROVE", "REQUEST_RECTIFICATION"]),
  reviewNotes: optionalTrimmed(1000).optional(),
});

export type SaveChecklistDraftInput = z.infer<typeof saveChecklistDraftSchema>;
export type SubmitChecklistInput = z.infer<typeof submitChecklistSchema>;
export type ReviewChecklistInput = z.infer<typeof reviewChecklistSchema>;
export type ItemAnswerInput = z.infer<typeof itemAnswerSchema>;
