import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/server/modules/auth/session";
import { getCautionById } from "@/server/modules/cautions/caution.service";
import { toPublicCaution } from "@/server/modules/cautions/caution.dto";
import { Errors } from "@/server/lib/errors";
import { CautionStatusBadge } from "@/components/cautions/caution-status-badge";
import { ChecklistActions } from "@/components/checklists/checklist-actions";
import { formatInstantBr } from "@/shared/time";
import { responsibleUserId } from "@/server/modules/cautions/responsible";

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

export default async function ViagemDetalhePage({ params }: Props) {
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
    includeUser: true,
    includeDriver: true,
    includeVehicle: true,
  });
  // Quem conduz preenche os checklists; o solicitante apenas acompanha.
  const isResponsible = responsibleUserId(cautionRaw) === session.user.id;
  const isRequester = cautionRaw.userId === session.user.id;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={isResponsible ? "/cautelas" : "/solicitacoes"}
          className="text-sm text-institutional-700 hover:underline"
        >
          {isResponsible ? "← Minhas viagens" : "← Minhas solicitações"}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-xl font-bold text-institutional-900">{c.publicCode}</h1>
          <CautionStatusBadge status={c.status} />
        </div>
      </div>

      {isResponsible && <ChecklistActions cautionId={c.id} status={c.status} />}

      <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">Viagem</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Row label="Saída prevista" value={formatDateTimeBr(c.plannedWithdrawalAt)} />
          <Row label="Retorno previsto" value={formatDateTimeBr(c.plannedReturnAt)} />
          {c.request?.origin && <Row label="Local de saída" value={c.request.origin} />}
          {c.request && <Row label="Destino" value={c.request.destination} />}
          {c.request?.passengerCount != null && (
            <Row label="Passageiros" value={String(c.request.passengerCount)} />
          )}
          {c.request && <Row label="Finalidade" value={c.request.reason} />}
          {c.actualWithdrawalAt && (
            <Row label="Saída efetiva" value={formatInstantBr(c.actualWithdrawalAt)} />
          )}
          {c.actualReturnAt && (
            <Row label="Retorno efetivo" value={formatInstantBr(c.actualReturnAt)} />
          )}
          {c.request?.passengerNames && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-gray-500">Nomes dos passageiros</dt>
              <dd className="mt-0.5 whitespace-pre-line font-medium text-gray-900">
                {c.request.passengerNames}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
          Pessoas
        </h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          {c.user && (
            <Row
              label="Solicitante"
              value={
                c.request?.requestingAgency
                  ? `${c.user.fullName} (${c.request.requestingAgency})`
                  : c.user.fullName
              }
            />
          )}
          <Row label="Contato no dia" value={c.request?.contactPhone ?? c.user?.phone ?? "—"} />
          <Row
            label="Condutor"
            value={
              c.driver
                ? `${c.driver.fullName} · ${c.driver.phone}`
                : "O próprio solicitante (cautela)"
            }
          />
        </dl>
      </section>

      {c.vehicle && (
        <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
            Veículo
          </h2>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Row label="Marca / Modelo" value={`${c.vehicle.brand} ${c.vehicle.model}`} />
            <Row label="Placa" value={c.vehicle.plateFormatted} />
          </dl>
        </section>
      )}

      {c.request && isRequester && (
        <div>
          <Link
            href={`/solicitacoes/${c.request.id}`}
            className="text-sm font-medium text-institutional-700 hover:underline"
          >
            Ver solicitação {c.request.publicCode} →
          </Link>
        </div>
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
