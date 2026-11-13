import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/server/modules/auth/session";
import { getRequestById } from "@/server/modules/requests/request.service";
import { toPublicRequest } from "@/server/modules/requests/request.dto";
import { Errors } from "@/server/lib/errors";
import { RequestStatusBadge } from "@/components/requests/request-status-badge";
import { CancelRequestButton } from "@/components/requests/cancel-request-button";
import { SHIFT_LABEL } from "@/components/requests/labels";

interface Props {
  params: Promise<{ id: string }>;
}

function formatDateBr(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default async function SolicitacaoDetalhePage({ params }: Props) {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=/solicitacoes");

  const { id } = await params;
  let req;
  try {
    req = await getRequestById(id, session);
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

  const r = toPublicRequest(req, { includeCaution: true });
  const canCancel = r.status === "PENDENTE_ANALISE";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/solicitacoes" className="text-sm text-institutional-700 hover:underline">
          ← Minhas solicitações
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-xl font-bold text-institutional-900">{r.publicCode}</h1>
          <RequestStatusBadge status={r.status} />
        </div>
      </div>

      {r.status === "NAO_APROVADA" && r.rejectionReason && (
        <div className="rounded-card border border-danger/30 bg-danger/5 p-4 text-sm">
          <p className="font-semibold text-danger">Motivo da recusa</p>
          <p className="mt-1 text-gray-700">{r.rejectionReason}</p>
        </div>
      )}

      {r.status === "APROVADA" && r.caution?.vehicle && (
        <div className="rounded-card border border-success/30 bg-success/5 p-4 text-sm">
          <p className="font-semibold text-success">Veículo liberado</p>
          <p className="mt-1 text-gray-800">
            {r.caution.vehicle.brand} {r.caution.vehicle.model} —{" "}
            <span className="font-mono">{r.caution.vehicle.plateFormatted}</span>
          </p>
          <p className="mt-1 text-xs text-gray-600">
            Cautela <span className="font-mono">{r.caution.publicCode}</span> — preencha o checklist
            de retirada no momento de retirar o veículo.
          </p>
          <div className="mt-3">
            <Link
              href={`/cautelas/${r.caution.id}`}
              className="text-sm font-medium text-success hover:underline"
            >
              Abrir cautela →
            </Link>
          </div>
        </div>
      )}

      <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
          Dados da solicitação
        </h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Row label="Data de retirada" value={formatDateBr(r.withdrawalDate)} />
          <Row label="Horário de retirada" value={r.withdrawalTime} />
          <Row label="Data de devolução" value={formatDateBr(r.returnDate)} />
          <Row label="Horário de devolução" value={r.returnTime} />
          <Row label="Turno" value={SHIFT_LABEL[r.shift]} />
          <Row label="Destino" value={r.destination} />
          <Row label="Motivo" value={r.reason} />
          {r.termNumber && <Row label="Número do termo" value={r.termNumber} />}
        </dl>
      </section>

      {canCancel && (
        <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">
            Ações
          </h2>
          <CancelRequestButton requestId={r.id} />
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
