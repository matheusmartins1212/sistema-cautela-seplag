import { ChecklistType, FuelLevel, type Checklist, type ChecklistItem } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

/**
 * Comparação automática entre o checklist de RETIRADA e o de DEVOLUCAO de uma
 * mesma cautela (seção 16 da especificação). Gera lista de divergências para
 * exibir ao admin durante a análise. Não muda dados — só reporta.
 */

export interface ComparisonItemDivergence {
  itemKey: string;
  itemLabel: string;
  before: string | null;
  after: string | null;
}

export interface ComparisonResult {
  hasRetirada: boolean;
  hasDevolucao: boolean;
  itemsDeteriorated: ComparisonItemDivergence[];
  fuelDeteriorated: { before: FuelLevel; after: FuelLevel } | null;
  mileageDelta: number | null; // devolução - retirada
  mileageInconsistent: boolean; // delta negativo
  damageDeclaredOnReturn: boolean;
}

const FUEL_ORDER: Record<FuelLevel, number> = {
  CHEIO: 6,
  TRES_QUARTOS: 5,
  MEIO: 4,
  UM_QUARTO: 3,
  RESERVA: 2,
  VAZIO: 1,
};

/**
 * Considera-se "piorou" se a resposta foi BOM/NAO_SE_APLICA na retirada e
 * RUIM/AUSENTE na devolução. Itens RUIM antes seguem RUIM (não conta).
 */
function isDeteriorated(before: ChecklistItem["answer"], after: ChecklistItem["answer"]): boolean {
  if (!before || !after) return false;
  const wasGood = before === "BOM" || before === "NAO_SE_APLICA";
  const isBad = after === "RUIM" || after === "AUSENTE";
  return wasGood && isBad;
}

export async function compareChecklistsOfCaution(cautionId: string): Promise<ComparisonResult> {
  const checklists = await prisma.checklist.findMany({
    where: { cautionId },
    include: { items: true },
  });

  const retirada = checklists.find((c) => c.type === ChecklistType.RETIRADA) ?? null;
  const devolucao = checklists.find((c) => c.type === ChecklistType.DEVOLUCAO) ?? null;

  if (!retirada || !devolucao) {
    return {
      hasRetirada: !!retirada,
      hasDevolucao: !!devolucao,
      itemsDeteriorated: [],
      fuelDeteriorated: null,
      mileageDelta: null,
      mileageInconsistent: false,
      damageDeclaredOnReturn: false,
    };
  }

  const itemsBeforeByKey = new Map(retirada.items.map((i) => [i.itemKey, i]));
  const deteriorated: ComparisonItemDivergence[] = [];
  for (const after of devolucao.items) {
    const before = itemsBeforeByKey.get(after.itemKey);
    if (before && isDeteriorated(before.answer, after.answer)) {
      deteriorated.push({
        itemKey: after.itemKey,
        itemLabel: after.itemLabel,
        before: before.answer,
        after: after.answer,
      });
    }
  }

  let fuelDeteriorated: ComparisonResult["fuelDeteriorated"] = null;
  if (retirada.fuelLevel && devolucao.fuelLevel) {
    if (FUEL_ORDER[devolucao.fuelLevel] < FUEL_ORDER[retirada.fuelLevel]) {
      fuelDeteriorated = {
        before: retirada.fuelLevel,
        after: devolucao.fuelLevel,
      };
    }
  }

  const mileageDelta =
    retirada.mileage != null && devolucao.mileage != null
      ? devolucao.mileage - retirada.mileage
      : null;
  const mileageInconsistent = mileageDelta != null && mileageDelta < 0;

  return {
    hasRetirada: true,
    hasDevolucao: true,
    itemsDeteriorated: deteriorated,
    fuelDeteriorated,
    mileageDelta,
    mileageInconsistent,
    damageDeclaredOnReturn: !!devolucao.hasDamage,
  };
}

/**
 * Decide se a comparação produz "atenção" suficiente para alertar o admin.
 * Útil para notificação de DEVOLUCAO_EM_ANALISE.
 */
export function hasNotableDivergence(c: ComparisonResult): boolean {
  return (
    c.itemsDeteriorated.length > 0 ||
    c.fuelDeteriorated !== null ||
    c.mileageInconsistent ||
    c.damageDeclaredOnReturn
  );
}

/** Trecho usado nos testes — não é re-export desnecessário no bundle. */
export type ChecklistWithItemsLite = Checklist & { items: ChecklistItem[] };
