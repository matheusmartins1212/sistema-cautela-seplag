import Link from "next/link";
import type { VehicleStatus } from "@prisma/client";
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
import { VEHICLE_STATUS_LABEL } from "@/components/vehicles/labels";
import { formatInstantBr } from "@/shared/time";
import { formatPhoneBr } from "@/shared/phone";

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
    includeDriver: true,
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
          ← Viagens
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
            <Row label="Telefone" value={formatPhoneBr(c.user.phone)} />
            <Row label="Órgão" value={c.request?.requestingAgency ?? c.user.agency ?? "—"} />
            <Row label="Setor" value={c.user.sector} />
            {c.request?.contactPhone && (
              <Row label="Contato no dia" value={formatPhoneBr(c.request.contactPhone)} />
            )}
          </dl>
        </section>
      )}

      <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
          Condutor
        </h2>
        {c.driver ? (
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Row label="Nome" value={c.driver.fullName} />
            <Row label="Telefone" value={formatPhoneBr(c.driver.phone)} />
            <Row label="E-mail" value={c.driver.email} />
          </dl>
        ) : (
          <p className="text-sm text-gray-600">
            Cautela anterior à central: o próprio solicitante conduz e preenche os checklists.
          </p>
        )}
      </section>

      {c.vehicle && (
        <section className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">
            Veículo
          </h2>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Row label="Marca / Modelo" value={`${c.vehicle.brand} ${c.vehicle.model}`} />
            <Row label="Placa" value={c.vehicle.plateFormatted} />
            <Row
              label="Status atual"
              value={VEHICLE_STATUS_LABEL[c.vehicle.currentStatus as VehicleStatus]}
            />
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
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">Viagem</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Row label="Saída prevista" value={formatDateTimeBr(c.plannedWithdrawalAt)} />
          <Row label="Retorno previsto" value={formatDateTimeBr(c.plannedReturnAt)} />
          {c.request?.origin && <Row label="Local de saída" value={c.request.origin} />}
          {c.request && <Row label="Destino" value={c.request.destination} />}
          {c.request?.passengerCount != null && (
            <Row label="Passageiros" value={String(c.request.passengerCount)} />
          )}
          {c.actualWithdrawalAt && (
            <Row label="Saída efetiva" value={formatInstantBr(c.actualWithdrawalAt)} />
          )}
          {c.actualReturnAt && (
            <Row label="Retorno efetivo" value={formatInstantBr(c.actualReturnAt)} />
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
            <Row label="Finalidade" value={c.request.reason} />
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
