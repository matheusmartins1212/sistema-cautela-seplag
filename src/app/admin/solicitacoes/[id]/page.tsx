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
import { modalityLabel } from "@/components/requests/trip-text";
import {
  DetailCard,
  DetailHeader,
  DetailLayout,
  RelatedItem,
  RelatedList,
} from "@/components/ui/detail";
import { CautionStatusBadge } from "@/components/cautions/caution-status-badge";
import type { CautionStatus } from "@prisma/client";
import { formatPlate } from "@/shared/validation/plate";
import { formatPhoneBr } from "@/shared/phone";
import { currentYearCuiaba, formatPeriod, shortCode } from "@/shared/format";

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
  const year = currentYearCuiaba();

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

  const caution = r.status === "APROVADA" ? r.caution : null;
  // Aprovado, vale o que a central definiu (ela pode escalar condutor mesmo sem pedido).
  const withDriver = caution ? Boolean(caution.driver) : r.withDriver;

  return (
    <div className="space-y-6">
      <DetailHeader
        backHref="/admin/solicitacoes"
        backLabel="Solicitações"
        title={r.destination}
        code={shortCode(r.publicCode)}
        codeTitle={r.publicCode}
        badges={<RequestStatusBadge status={r.status} />}
        meta={`${formatPeriod(r.withdrawalDate, r.withdrawalTime, r.returnDate, r.returnTime, year)} · ${modalityLabel(withDriver)}`}
      />

      <DetailLayout
        main={
          <>
            {pending && (
              <DetailCard
                title="Análise da central"
                description={
                  r.withDriver
                    ? "Defina o veículo e o condutor, ou recuse informando o motivo."
                    : "Defina o veículo, ou recuse informando o motivo."
                }
                tone="highlight"
              >
                <AdminDecisionPanel
                  requestId={r.id}
                  availableVehicles={availableVehicles}
                  availableDrivers={availableDrivers}
                  passengerCount={r.passengerCount}
                  withDriver={r.withDriver}
                />
              </DetailCard>
            )}

            {r.status === "NAO_APROVADA" && r.rejectionReason && (
              <DetailCard title="Motivo da recusa" tone="danger">
                <p className="whitespace-pre-line text-sm text-gray-800">{r.rejectionReason}</p>
              </DetailCard>
            )}

            <DetailCard title="Pedido">
              <TransportDetails r={r} />
              {r.adminNotes && (
                <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
                  Observação da central: {r.adminNotes}
                </p>
              )}
            </DetailCard>
          </>
        }
        aside={
          <DetailCard title="Envolvidos">
            <RelatedList>
              {r.user && (
                <RelatedItem
                  label="Solicitante"
                  title={r.user.fullName}
                  detail={
                    <>
                      {formatPhoneBr(r.user.phone)}
                      <span className="block">
                        {[r.user.agency, r.user.sector].filter(Boolean).join(" · ")}
                      </span>
                    </>
                  }
                  href={`/admin/usuarios/${r.user.id}`}
                />
              )}
              {caution && (
                <RelatedItem
                  label="Viagem"
                  title={<span className="font-mono">{shortCode(caution.publicCode)}</span>}
                  badge={<CautionStatusBadge status={caution.status as CautionStatus} />}
                  href={`/admin/cautelas/${caution.id}`}
                />
              )}
              {caution?.vehicle && (
                <RelatedItem
                  label="Veículo"
                  title={`${caution.vehicle.brand} ${caution.vehicle.model}`}
                  detail={<span className="font-mono">{caution.vehicle.plateFormatted}</span>}
                  href={`/admin/veiculos/${caution.vehicle.id}`}
                />
              )}
              {caution &&
                (caution.driver ? (
                  <RelatedItem
                    label="Condutor"
                    title={caution.driver.fullName}
                    detail={formatPhoneBr(caution.driver.phone)}
                    href={`/admin/usuarios/${caution.driver.id}`}
                  />
                ) : (
                  <RelatedItem label="Condutor" title="O próprio solicitante dirige" />
                ))}
            </RelatedList>
          </DetailCard>
        }
      />
    </div>
  );
}
