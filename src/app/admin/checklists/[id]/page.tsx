import type { ChecklistAnswer } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/server/modules/auth/session";
import { isAdmin } from "@/server/modules/auth/rbac";
import {
  getChecklistById,
  getChecklistReviews,
} from "@/server/modules/checklists/checklist.service";
import { toPublicChecklist } from "@/server/modules/checklists/checklist.dto";
import {
  compareChecklistsOfCaution,
  hasNotableDivergence,
} from "@/server/modules/checklists/comparison.service";
import { prisma } from "@/server/db/prisma";
import { Errors } from "@/server/lib/errors";
import { ChecklistStatusBadge } from "@/components/checklists/checklist-status-badge";
import { ReviewChecklistPanel } from "@/components/checklists/review-checklist-panel";
import { PhotoGallery } from "@/components/checklists/photo-gallery";
import {
  ANSWER_LABEL,
  CHECKLIST_TYPE_LABEL,
  CLEANLINESS_LABEL,
  FUEL_CARD_LABEL,
  FUEL_LEVEL_LABEL,
  ITEM_GROUP_LABEL,
} from "@/components/checklists/labels";
import { DetailCard, DetailHeader, DetailLayout, Fact, Facts } from "@/components/ui/detail";
import {
  countLabel,
  currentYearCuiaba,
  formatDateTimeParts,
  formatInstantDateTime,
  formatKm,
  shortCode,
} from "@/shared/format";
import { formatPlate } from "@/shared/validation/plate";
import { cn } from "@/lib/cn";

interface Props {
  params: Promise<{ id: string }>;
}

/** Respostas que pedem atenção da central. */
const PROBLEM_ANSWERS = new Set<ChecklistAnswer>(["RUIM", "AUSENTE"]);

export default async function AdminChecklistDetalhePage({ params }: Props) {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=/admin/cautelas");
  if (!isAdmin(session.user.role)) redirect("/painel");

  const { id } = await params;
  let raw;
  try {
    raw = await getChecklistById(id, session);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === Errors.notFound().code
    ) {
      notFound();
    }
    throw error;
  }
  const c = toPublicChecklist(raw);
  const year = currentYearCuiaba();

  const [comparison, reviews, caution, filledBy] = await Promise.all([
    c.type === "DEVOLUCAO" ? compareChecklistsOfCaution(c.cautionId) : Promise.resolve(null),
    getChecklistReviews(c.id),
    prisma.caution.findUnique({
      where: { id: c.cautionId },
      select: { publicCode: true, vehicle: { select: { brand: true, model: true, plate: true } } },
    }),
    prisma.user.findUnique({ where: { id: c.userId }, select: { fullName: true } }),
  ]);
  const showDivergence = comparison && hasNotableDivergence(comparison);

  const typeLabel = CHECKLIST_TYPE_LABEL[c.type].toLowerCase();
  const problems = c.items.filter(
    (it) => (it.answer && PROBLEM_ANSWERS.has(it.answer)) || it.observation,
  );
  const unanswered = c.items.filter((it) => !it.answer).length;
  const itemsSummary =
    problems.length === 0 && unanswered === 0
      ? `${countLabel(c.items.length, "item verificado", "itens verificados")}, sem problemas.`
      : [
          problems.length > 0 &&
            `${countLabel(problems.length, "item pede", "itens pedem")} atenção`,
          unanswered > 0 && `${countLabel(unanswered, "item", "itens")} sem resposta`,
        ]
          .filter(Boolean)
          .join(" · ") + ` (de ${c.items.length}).`;

  const itemsByGroup = c.items.reduce<Record<string, typeof c.items>>((acc, it) => {
    const k = it.category ?? "GERAIS";
    if (!acc[k]) acc[k] = [];
    acc[k].push(it);
    return acc;
  }, {});

  const vehicleText = caution?.vehicle
    ? `${caution.vehicle.brand} ${caution.vehicle.model} · ${formatPlate(caution.vehicle.plate)}`
    : null;
  const sentText = c.submittedAt
    ? `enviado em ${formatInstantDateTime(c.submittedAt, year)}${filledBy ? ` por ${filledBy.fullName}` : ""}`
    : "ainda não enviado";

  return (
    <div className="space-y-6">
      <DetailHeader
        backHref={`/admin/cautelas/${c.cautionId}`}
        backLabel={caution ? `Viagem ${shortCode(caution.publicCode)}` : "Viagem"}
        title={`Checklist de ${typeLabel}`}
        badges={<ChecklistStatusBadge status={c.status} />}
        meta={[vehicleText, sentText].filter(Boolean).join(" · ")}
      />

      <DetailLayout
        main={
          <>
            {c.status === "ENVIADO" && (
              <DetailCard
                title="Análise da central"
                description="Aprove o checklist ou peça correção a quem preencheu."
                tone="highlight"
              >
                <ReviewChecklistPanel checklistId={c.id} />
              </DetailCard>
            )}

            {showDivergence && comparison && (
              <DetailCard title="Diferenças entre a saída e o retorno" tone="warning">
                <ul className="space-y-1.5 text-sm text-gray-800">
                  {comparison.fuelDeteriorated && (
                    <li>
                      Combustível baixou de{" "}
                      <strong>{FUEL_LEVEL_LABEL[comparison.fuelDeteriorated.before]}</strong> para{" "}
                      <strong>{FUEL_LEVEL_LABEL[comparison.fuelDeteriorated.after]}</strong>.
                    </li>
                  )}
                  {comparison.mileageInconsistent && (
                    <li>
                      Quilometragem inconsistente: o retorno marca{" "}
                      <strong>{formatKm(Math.abs(comparison.mileageDelta ?? 0))}</strong> a menos
                      que a saída.
                    </li>
                  )}
                  {comparison.damageDeclaredOnReturn && <li>Avaria declarada no retorno.</li>}
                  {comparison.itemsDeteriorated.map((d) => (
                    <li key={d.itemKey}>
                      <strong>{d.itemLabel}</strong>:{" "}
                      {d.before ? (ANSWER_LABEL[d.before as ChecklistAnswer] ?? d.before) : "?"} na
                      saída, {d.after ? (ANSWER_LABEL[d.after as ChecklistAnswer] ?? d.after) : "?"}{" "}
                      no retorno.
                    </li>
                  ))}
                </ul>
              </DetailCard>
            )}

            <DetailCard title="Resumo">
              <Facts columns={3}>
                <Fact label="Data e hora">
                  {c.realDate && c.realTime
                    ? formatDateTimeParts(c.realDate, c.realTime, year)
                    : "—"}
                </Fact>
                <Fact
                  label="Quilometragem"
                  note={
                    comparison?.mileageDelta != null && !comparison.mileageInconsistent
                      ? `${formatKm(comparison.mileageDelta)} rodados`
                      : undefined
                  }
                >
                  {c.mileage != null ? formatKm(c.mileage) : "—"}
                </Fact>
                <Fact label="Combustível">{c.fuelLevel ? FUEL_LEVEL_LABEL[c.fuelLevel] : "—"}</Fact>
                <Fact label="Cartão de abastecimento">
                  {c.fuelCardStatus ? FUEL_CARD_LABEL[c.fuelCardStatus] : "—"}
                </Fact>
                <Fact label="Limpeza interna">
                  {c.internalCleanliness ? CLEANLINESS_LABEL[c.internalCleanliness] : "—"}
                </Fact>
                <Fact label="Limpeza externa">
                  {c.externalCleanliness ? CLEANLINESS_LABEL[c.externalCleanliness] : "—"}
                </Fact>
                {c.parkingLocation && <Fact label="Local estacionado">{c.parkingLocation}</Fact>}
                {(c.hasDamage || c.damageDescription) && (
                  <Fact label="Avaria declarada" wide>
                    {c.damageDescription || "Sim"}
                  </Fact>
                )}
                {(c.hasChangesFromInitial || c.changesDescription) && (
                  <Fact label="Alterações desde a saída" wide>
                    {c.changesDescription || "Sim"}
                  </Fact>
                )}
                {c.generalNotes && (
                  <Fact label="Observações" wide>
                    {c.generalNotes}
                  </Fact>
                )}
              </Facts>
            </DetailCard>

            <DetailCard title="Itens" description={itemsSummary}>
              {problems.length > 0 && (
                <ul className="mb-4 divide-y divide-amber-100 overflow-hidden rounded-md border border-amber-200 bg-amber-50/60">
                  {problems.map((it) => (
                    <li key={it.id} className="px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-gray-900">{it.itemLabel}</span>
                        <span className="text-xs font-semibold text-amber-800">
                          {it.answer ? ANSWER_LABEL[it.answer] : "Sem resposta"}
                        </span>
                      </div>
                      {it.observation && (
                        <p className="mt-0.5 text-xs text-gray-600">{it.observation}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <details className="group">
                <summary className="cursor-pointer list-none text-sm font-medium text-institutional-700 hover:text-institutional-900">
                  <span className="group-open:hidden">Ver os {c.items.length} itens</span>
                  <span className="hidden group-open:inline">Esconder os itens</span>
                </summary>
                <div className="mt-3 space-y-4">
                  {Object.entries(itemsByGroup).map(([groupKey, items]) => (
                    <div key={groupKey}>
                      <h3 className="mb-1.5 text-xs font-semibold text-gray-500">
                        {ITEM_GROUP_LABEL[groupKey] ?? groupKey}
                      </h3>
                      <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
                        {items.map((it) => (
                          <li
                            key={it.id}
                            className="flex items-center justify-between gap-3 px-3 py-1.5"
                          >
                            <span className="text-sm text-gray-800">{it.itemLabel}</span>
                            <span
                              className={cn(
                                "text-xs font-semibold",
                                it.answer && PROBLEM_ANSWERS.has(it.answer)
                                  ? "text-amber-800"
                                  : "text-gray-500",
                              )}
                            >
                              {it.answer ? ANSWER_LABEL[it.answer] : "Sem resposta"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </details>
            </DetailCard>

            <DetailCard title="Fotos">
              <PhotoGallery checklistId={c.id} />
            </DetailCard>
          </>
        }
        aside={
          <DetailCard title="Revisões">
            {reviews.length === 0 ? (
              <p className="text-sm text-gray-500">
                {c.status === "ENVIADO" ? "Aguardando a análise da central." : "Nenhuma revisão."}
              </p>
            ) : (
              <ul className="-my-1 divide-y divide-gray-100">
                {reviews.map((r) => (
                  <li key={r.id} className="py-2.5">
                    <p className="text-sm font-medium text-gray-900">
                      {r.decision === "APPROVE" ? "Aprovado" : "Correção pedida"}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {r.reviewerName ? `${r.reviewerName} · ` : ""}
                      {formatInstantDateTime(r.createdAt, year)}
                    </p>
                    {r.notes && (
                      <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{r.notes}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </DetailCard>
        }
      />
    </div>
  );
}
