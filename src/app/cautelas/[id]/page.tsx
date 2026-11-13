import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/server/modules/auth/session";
import { getCautionById } from "@/server/modules/cautions/caution.service";
import { toPublicCaution } from "@/server/modules/cautions/caution.dto";
import { Errors } from "@/server/lib/errors";
import { CautionStatusBadge } from "@/components/cautions/caution-status-badge";
import { ChecklistActions } from "@/components/checklists/checklist-actions";

interface Props {
  params: Promise<{ id: string }>;
}

function formatDateTimeBr(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export default async function CautelaDetalhePage({ params }: Props) {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=/cautelas");

  const { id } = await params;
  let cautionRaw;
  try {
    cautionRaw = await getCautionById(id, session);
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
  const c = toPublicCaution(cautionRaw, {
    includeRequest: true,
    includeVehicle: true,
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/cautelas" className="text-sm text-institutional-700 hover:underline">
          ← Minhas cautelas
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-xl font-bold text-institutional-900">{c.publicCode}</h1>
          <CautionStatusBadge status={c.status} />
        </div>
      </div>

      <ChecklistActions cautionId={c.id} status={c.status} />

      {c.vehicle && (
        <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
            Veículo liberado
          </h2>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Row label="Marca / Modelo" value={`${c.vehicle.brand} ${c.vehicle.model}`} />
            <Row label="Placa" value={c.vehicle.plateFormatted} />
          </dl>
        </section>
      )}

      <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
          Período previsto
        </h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Row label="Retirada prevista" value={formatDateTimeBr(c.plannedWithdrawalAt)} />
          <Row label="Devolução prevista" value={formatDateTimeBr(c.plannedReturnAt)} />
          {c.actualWithdrawalAt && (
            <Row label="Retirada efetiva" value={formatDateTimeBr(c.actualWithdrawalAt)} />
          )}
          {c.actualReturnAt && (
            <Row label="Devolução efetiva" value={formatDateTimeBr(c.actualReturnAt)} />
          )}
        </dl>
      </section>

      {c.request && (
        <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
            Solicitação vinculada
          </h2>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Row label="Código" value={c.request.publicCode} />
            <Row label="Destino" value={c.request.destination} />
            <Row label="Motivo" value={c.request.reason} />
          </dl>
          <div className="mt-4">
            <Link
              href={`/solicitacoes/${c.request.id}`}
              className="text-sm font-medium text-institutional-700 hover:underline"
            >
              Ver solicitação completa →
            </Link>
          </div>
        </section>
      )}

      {c.finalNotes && (
        <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
            Observação
          </h2>
          <p className="text-sm text-gray-700">{c.finalNotes}</p>
        </section>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-gray-900">{value}</dd>
    </div>
  );
}
