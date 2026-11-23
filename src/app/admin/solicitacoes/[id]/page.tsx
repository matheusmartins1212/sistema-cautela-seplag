import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/server/modules/auth/session";
import {
  getRequestById,
  listDriverOptionsForRequest,
  listVehicleOptionsForRequest,
} from "@/server/modules/requests/request.service";
import { toPublicRequest } from "@/server/modules/requests/request.dto";
import { Errors } from "@/server/lib/errors";
import { isAdmin } from "@/server/modules/auth/rbac";
import { RequestStatusBadge } from "@/components/requests/request-status-badge";
import { AdminDecisionPanel } from "@/components/requests/admin-decision-panel";
import { TransportDetails } from "@/components/requests/transport-details";
import { formatPlate } from "@/shared/validation/plate";
import { formatPhoneBr } from "@/shared/phone";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminSolicitacaoDetalhePage({ params }: Props) {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=/admin/solicitacoes");
  if (!isAdmin(session.user.role)) redirect("/painel");

  const { id } = await params;
  let reqRaw;
  try {
    reqRaw = await getRequestById(id, session);
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
  const r = toPublicRequest(reqRaw, { includeUser: true, includeCaution: true });

  // Opções de veículo e condutor só interessam enquanto a solicitação está em análise.
  const pending = r.status === "PENDENTE_ANALISE";
  const availableDrivers = pending
    ? (await listDriverOptionsForRequest(r.id)).map((d) => ({
        id: d.id,
        fullName: d.fullName,
        phone: d.phone,
        driverLicenseCategory: d.driverLicenseCategory,
        conflictCode: d.conflictCode,
        licenseExpired: d.licenseExpired,
      }))
    : [];
  const availableVehicles = pending
    ? (await listVehicleOptionsForRequest(r.id)).map((v) => ({
        id: v.id,
        brand: v.brand,
        model: v.model,
        plate: v.plate,
        plateFormatted: formatPlate(v.plate),
        category: v.category,
        currentStatus: v.currentStatus,
        conflictCode: v.conflictCode,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/solicitacoes" className="text-sm text-institutional-700 hover:underline">
          ← Solicitações
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-xl font-bold text-institutional-900">{r.publicCode}</h1>
          <RequestStatusBadge status={r.status} />
        </div>
      </div>

      <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
          Solicitante
        </h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Row label="Nome" value={r.user?.fullName ?? "—"} />
          <Row label="Matrícula" value={r.user?.registrationNumber ?? "—"} />
          <Row label="E-mail" value={r.user?.email ?? "—"} />
          <Row label="Telefone" value={r.user?.phone ? formatPhoneBr(r.user.phone) : "—"} />
          <Row label="Órgão" value={r.user?.agency ?? "—"} />
          <Row label="Setor" value={r.user?.sector ?? "—"} />
          <Row label="Lotação" value={r.user?.department ?? "—"} />
        </dl>
      </section>

      <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
          Dados da solicitação
        </h2>
        <TransportDetails r={r} />
      </section>

      {r.status === "APROVADA" && r.caution?.vehicle && (
        <section className="rounded-card border border-success/30 bg-success/5 p-6 shadow-card">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-success">
            Viagem vinculada
          </h2>
          <p className="text-sm text-gray-800">
            <span className="font-mono font-semibold">{r.caution.publicCode}</span> ·{" "}
            {r.caution.vehicle.brand} {r.caution.vehicle.model} —{" "}
            <span className="font-mono">{r.caution.vehicle.plateFormatted}</span>
          </p>
          <p className="mt-1 text-sm text-gray-800">
            Condutor:{" "}
            {r.caution.driver
              ? `${r.caution.driver.fullName} · ${formatPhoneBr(r.caution.driver.phone)}`
              : "o próprio solicitante (cautela)"}
          </p>
          {r.adminNotes && <p className="mt-2 text-xs text-gray-600">Observação: {r.adminNotes}</p>}
          <div className="mt-3">
            <Link
              href={`/admin/cautelas/${r.caution.id}`}
              className="text-sm font-medium text-success hover:underline"
            >
              Gerenciar viagem →
            </Link>
          </div>
        </section>
      )}

      {r.status === "NAO_APROVADA" && r.rejectionReason && (
        <section className="rounded-card border border-danger/30 bg-danger/5 p-6 shadow-card">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-danger">Recusa</h2>
          <p className="text-sm text-gray-700">{r.rejectionReason}</p>
        </section>
      )}

      {r.status === "PENDENTE_ANALISE" && (
        <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">
            Decisão administrativa
          </h2>
          <AdminDecisionPanel
            requestId={r.id}
            availableVehicles={availableVehicles}
            availableDrivers={availableDrivers}
            passengerCount={r.passengerCount}
            withDriver={r.withDriver}
          />
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
