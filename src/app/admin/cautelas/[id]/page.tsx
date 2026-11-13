import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/server/modules/auth/session";
import {
  getCautionById,
  isCautionCancellable,
  isVehicleOut,
} from "@/server/modules/cautions/caution.service";
import { toPublicCaution } from "@/server/modules/cautions/caution.dto";
import { prisma } from "@/server/db/prisma";
import { Errors } from "@/server/lib/errors";
import { isAdmin } from "@/server/modules/auth/rbac";
import { CautionStatusBadge } from "@/components/cautions/caution-status-badge";
import { CancelCautionButton } from "@/components/cautions/cancel-caution-button";
import { ChecklistStatusBadge } from "@/components/checklists/checklist-status-badge";
import { CHECKLIST_TYPE_LABEL } from "@/components/checklists/labels";

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

export default async function AdminCautelaDetalhePage({ params }: Props) {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=/admin/cautelas");
  if (!isAdmin(session.user.role)) redirect("/painel");

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
    includeVehicle: true,
  });

  const canCancel = isCautionCancellable(c.status);

  // Carrega os checklists já existentes (RETIRADA/DEVOLUCAO) para listar no admin.
  const checklists = await prisma.checklist.findMany({
    where: { cautionId: c.id },
    select: { id: true, type: true, status: true, submittedAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/cautelas" className="text-sm text-institutional-700 hover:underline">
          ← Cautelas
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-xl font-bold text-institutional-900">{c.publicCode}</h1>
            <CautionStatusBadge status={c.status} />
          </div>
          {canCancel && (
            <CancelCautionButton
              cautionId={c.id}
              publicCode={c.publicCode}
              vehicleOut={isVehicleOut(c.status)}
            />
          )}
        </div>
      </div>

      {c.user && (
        <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
            Solicitante
          </h2>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Row label="Nome" value={c.user.fullName} />
            <Row label="Matrícula" value={c.user.registrationNumber} />
            <Row label="E-mail" value={c.user.email} />
            <Row label="Telefone" value={c.user.phone} />
            <Row label="Setor" value={c.user.sector} />
          </dl>
        </section>
      )}

      {c.vehicle && (
        <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
            Veículo
          </h2>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Row label="Marca / Modelo" value={`${c.vehicle.brand} ${c.vehicle.model}`} />
            <Row label="Placa" value={c.vehicle.plateFormatted} />
            <Row label="Status atual" value={c.vehicle.currentStatus} />
          </dl>
          <div className="mt-4">
            <Link
              href={`/admin/veiculos/${c.vehicle.id}`}
              className="text-sm font-medium text-institutional-700 hover:underline"
            >
              Ver veículo →
            </Link>
          </div>
        </section>
      )}

      <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
          Período
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
              href={`/admin/solicitacoes/${c.request.id}`}
              className="text-sm font-medium text-institutional-700 hover:underline"
            >
              Ver solicitação →
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

      <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600">
          Checklists
        </h2>
        {checklists.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum checklist iniciado ainda.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {checklists.map((cl) => (
              <li
                key={cl.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">
                    {CHECKLIST_TYPE_LABEL[cl.type]}
                  </span>
                  <ChecklistStatusBadge status={cl.status} />
                </div>
                <Link
                  href={`/admin/checklists/${cl.id}`}
                  className="text-sm font-medium text-institutional-700 hover:underline"
                >
                  Abrir →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
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
