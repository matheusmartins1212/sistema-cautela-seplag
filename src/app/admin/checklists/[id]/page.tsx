import Link from "next/link";
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
import { Errors } from "@/server/lib/errors";
import { formatInstantBr, formatIsoDateBr } from "@/shared/time";
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

interface Props {
  params: Promise<{ id: string }>;
}

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

  const [comparison, reviews] = await Promise.all([
    c.type === "DEVOLUCAO" ? compareChecklistsOfCaution(c.cautionId) : Promise.resolve(null),
    getChecklistReviews(c.id),
  ]);
  const showDivergencePanel = comparison && hasNotableDivergence(comparison);

  const itemsByGroup = c.items.reduce<Record<string, typeof c.items>>((acc, it) => {
    const k = it.category ?? "GERAIS";
    if (!acc[k]) acc[k] = [];
    acc[k].push(it);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/cautelas/${c.cautionId}`}
          className="text-sm text-institutional-700 hover:underline"
        >
          ← Viagem
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-institutional-900">
            Checklist — {CHECKLIST_TYPE_LABEL[c.type]}
          </h1>
          <ChecklistStatusBadge status={c.status} />
        </div>
      </div>

      <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
          Dados gerais
        </h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Row label="Data" value={c.realDate ? formatIsoDateBr(c.realDate) : "—"} />
          <Row label="Horário" value={c.realTime ?? "—"} />
          <Row label="Quilometragem" value={c.mileage != null ? String(c.mileage) : "—"} />
          <Row label="Combustível" value={c.fuelLevel ? FUEL_LEVEL_LABEL[c.fuelLevel] : "—"} />
          <Row
            label="Cartão de abastecimento"
            value={c.fuelCardStatus ? FUEL_CARD_LABEL[c.fuelCardStatus] : "—"}
          />
          <Row
            label="Limpeza interna"
            value={c.internalCleanliness ? CLEANLINESS_LABEL[c.internalCleanliness] : "—"}
          />
          <Row
            label="Limpeza externa"
            value={c.externalCleanliness ? CLEANLINESS_LABEL[c.externalCleanliness] : "—"}
          />
          {c.parkingLocation && <Row label="Local estacionado" value={c.parkingLocation} />}
        </dl>
      </section>

      <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
          Itens ({c.items.length})
        </h2>
        <div className="space-y-5">
          {Object.entries(itemsByGroup).map(([groupKey, items]) => (
            <div key={groupKey}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-institutional-700">
                {ITEM_GROUP_LABEL[groupKey] ?? groupKey}
              </h3>
              <ul className="divide-y divide-gray-100 rounded-md border border-gray-200 bg-gray-50">
                {items.map((it) => (
                  <li
                    key={it.id}
                    className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-sm text-gray-800">{it.itemLabel}</span>
                    <span className="text-xs font-semibold text-institutional-900">
                      {it.answer ? ANSWER_LABEL[it.answer] : "Sem resposta"}
                    </span>
                    {it.observation && (
                      <span className="text-xs text-gray-600 sm:basis-full">
                        Obs.: {it.observation}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {(c.hasChangesFromInitial ||
        c.changesDescription ||
        c.hasDamage ||
        c.damageDescription ||
        c.generalNotes) && (
        <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
            Observações
          </h2>
          {c.hasChangesFromInitial && <Row label="Alterações em relação ao inicial" value="Sim" />}
          {c.changesDescription && (
            <Row label="Descrição das alterações" value={c.changesDescription} />
          )}
          {c.hasDamage && <Row label="Possui avaria" value="Sim" />}
          {c.damageDescription && <Row label="Descrição da avaria" value={c.damageDescription} />}
          {c.generalNotes && <Row label="Observações gerais" value={c.generalNotes} />}
        </section>
      )}

      {showDivergencePanel && comparison && (
        <section className="rounded-card border border-warning/40 bg-warning/5 p-6 shadow-card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-warning">
            Comparação saída × retorno
          </h2>
          <ul className="space-y-2 text-sm text-gray-800">
            {comparison.fuelDeteriorated && (
              <li>
                ⛽ Combustível abaixou:{" "}
                <strong>{FUEL_LEVEL_LABEL[comparison.fuelDeteriorated.before]}</strong> →{" "}
                <strong>{FUEL_LEVEL_LABEL[comparison.fuelDeteriorated.after]}</strong>
              </li>
            )}
            {comparison.mileageInconsistent && (
              <li>
                🛞 Quilometragem inconsistente: o retorno marca{" "}
                <strong>{Math.abs(comparison.mileageDelta ?? 0).toLocaleString("pt-BR")}</strong> km
                a menos que a saída.
              </li>
            )}
            {comparison.mileageDelta != null && !comparison.mileageInconsistent && (
              <li>
                Quilometragem rodada:{" "}
                <strong>{comparison.mileageDelta.toLocaleString("pt-BR")}</strong> km.
              </li>
            )}
            {comparison.damageDeclaredOnReturn && (
              <li>⚠️ Avaria declarada pelo condutor no retorno.</li>
            )}
            {comparison.itemsDeteriorated.length > 0 && (
              <li>
                Itens que pioraram ({comparison.itemsDeteriorated.length}):
                <ul className="ml-4 mt-1 list-disc text-xs">
                  {comparison.itemsDeteriorated.map((d) => (
                    <li key={d.itemKey}>
                      <strong>{d.itemLabel}</strong>:{" "}
                      {d.before ? (ANSWER_LABEL[d.before as ChecklistAnswer] ?? d.before) : "?"} →{" "}
                      {d.after ? (ANSWER_LABEL[d.after as ChecklistAnswer] ?? d.after) : "?"}
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </ul>
        </section>
      )}

      <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">Fotos</h2>
        <PhotoGallery checklistId={c.id} />
      </section>

      {reviews.length > 0 && (
        <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">
            Revisões
          </h2>
          <ul className="space-y-3 text-sm">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-md border border-gray-100 bg-gray-50 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-gray-900">
                    {r.decision === "APPROVE" ? "Aprovado" : "Correção pedida"}
                    {r.reviewerName ? ` por ${r.reviewerName}` : ""}
                  </span>
                  <time className="text-xs text-gray-500">{formatInstantBr(r.createdAt)}</time>
                </div>
                {r.notes && <p className="mt-1 whitespace-pre-line text-gray-700">{r.notes}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.status === "ENVIADO" && (
        <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">
            Decisão administrativa
          </h2>
          <ReviewChecklistPanel checklistId={c.id} />
        </section>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2">
      <dt className="text-xs uppercase text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}
