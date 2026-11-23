import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/server/modules/auth/session";
import { getRequestById } from "@/server/modules/requests/request.service";
import { toPublicRequest } from "@/server/modules/requests/request.dto";
import { Errors } from "@/server/lib/errors";
import { RequestStatusBadge } from "@/components/requests/request-status-badge";
import { CancelRequestButton } from "@/components/requests/cancel-request-button";
import { TransportDetails } from "@/components/requests/transport-details";
import { formatPhoneBr } from "@/shared/phone";

interface Props {
  params: Promise<{ id: string }>;
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
          <p className="font-semibold text-success">
            {r.caution.driver ? "Transporte confirmado" : "Veículo liberado para você"}
          </p>
          <dl className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Row
              label="Veículo"
              value={`${r.caution.vehicle.brand} ${r.caution.vehicle.model} · ${r.caution.vehicle.plateFormatted}`}
            />
            {r.caution.driver ? (
              <Row
                label="Condutor"
                value={`${r.caution.driver.fullName} · ${formatPhoneBr(r.caution.driver.phone)}`}
              />
            ) : (
              <Row label="Quem dirige" value="Você mesmo: preencha o checklist na retirada" />
            )}
          </dl>
          <p className="mt-3 text-xs text-gray-600">
            Viagem <span className="font-mono">{r.caution.publicCode}</span>. Em caso de mudança de
            horário ou destino, avise a central com o código da solicitação.
          </p>
          <div className="mt-3">
            <Link
              href={`/cautelas/${r.caution.id}`}
              className="text-sm font-medium text-success hover:underline"
            >
              {r.caution.driver ? "Acompanhar viagem →" : "Abrir a viagem e os checklists →"}
            </Link>
          </div>
        </div>
      )}

      <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
          Dados da solicitação
        </h2>
        <TransportDetails r={r} />
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
