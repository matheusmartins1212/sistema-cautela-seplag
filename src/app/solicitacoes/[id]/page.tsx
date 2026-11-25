import { notFound, redirect } from "next/navigation";
import type { CautionStatus } from "@prisma/client";
import { getCurrentSession } from "@/server/modules/auth/session";
import { getRequestById } from "@/server/modules/requests/request.service";
import { toPublicRequest } from "@/server/modules/requests/request.dto";
import { Errors } from "@/server/lib/errors";
import { RequestStatusBadge } from "@/components/requests/request-status-badge";
import { CancelRequestButton } from "@/components/requests/cancel-request-button";
import { TransportDetails } from "@/components/requests/transport-details";
import { modalityLabel } from "@/components/requests/trip-text";
import { CautionStatusBadge } from "@/components/cautions/caution-status-badge";
import {
  DetailCard,
  DetailHeader,
  DetailLayout,
  RelatedItem,
  RelatedList,
} from "@/components/ui/detail";
import { EMAIL_DELIVERY_ENABLED } from "@/shared/features";
import { formatPhoneBr } from "@/shared/phone";
import { currentYearCuiaba, formatPeriod, shortCode } from "@/shared/format";

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
  const year = currentYearCuiaba();
  const caution = r.status === "APROVADA" ? r.caution : null;
  // Aprovado, vale o que a central definiu (ela pode escalar condutor mesmo sem pedido).
  const withDriver = caution ? Boolean(caution.driver) : r.withDriver;

  return (
    <div className="space-y-6">
      <DetailHeader
        backHref="/solicitacoes"
        backLabel="Minhas solicitações"
        title={r.destination}
        code={shortCode(r.publicCode)}
        codeTitle={r.publicCode}
        badges={<RequestStatusBadge status={r.status} />}
        meta={`${formatPeriod(r.withdrawalDate, r.withdrawalTime, r.returnDate, r.returnTime, year)} · ${modalityLabel(withDriver, true)}`}
        actions={r.status === "PENDENTE_ANALISE" && <CancelRequestButton requestId={r.id} />}
      />

      <DetailLayout
        main={
          <>
            {r.status === "NAO_APROVADA" && r.rejectionReason && (
              <DetailCard title="Motivo da recusa" tone="danger">
                <p className="whitespace-pre-line text-sm text-gray-800">{r.rejectionReason}</p>
              </DetailCard>
            )}
            <DetailCard title="Pedido">
              <TransportDetails r={r} />
            </DetailCard>
          </>
        }
        aside={
          <DetailCard title="Transporte">
            {caution?.vehicle ? (
              <>
                <RelatedList>
                  <RelatedItem
                    label="Viagem"
                    title={<span className="font-mono">{shortCode(caution.publicCode)}</span>}
                    badge={<CautionStatusBadge status={caution.status as CautionStatus} />}
                    href={`/cautelas/${caution.id}`}
                  />
                  <RelatedItem
                    label="Veículo"
                    title={`${caution.vehicle.brand} ${caution.vehicle.model}`}
                    detail={<span className="font-mono">{caution.vehicle.plateFormatted}</span>}
                  />
                  {caution.driver ? (
                    <RelatedItem
                      label="Condutor"
                      title={caution.driver.fullName}
                      detail={formatPhoneBr(caution.driver.phone)}
                    />
                  ) : (
                    <RelatedItem
                      label="Quem dirige"
                      title="Você"
                      detail="Preencha o checklist de saída na retirada."
                    />
                  )}
                </RelatedList>
                <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
                  Se o horário ou o destino mudar, avise a central informando o código{" "}
                  <span className="font-mono">{shortCode(r.publicCode)}</span>.
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-600">
                {r.status === "PENDENTE_ANALISE"
                  ? `A central vai definir o veículo${r.withDriver ? " e o condutor" : ""}. Você recebe o aviso ${EMAIL_DELIVERY_ENABLED ? "por e-mail e " : ""}no sino de notificações.`
                  : r.status === "NAO_APROVADA"
                    ? "Este pedido não foi aprovado. Se ainda precisar do veículo, faça um novo pedido."
                    : r.status === "AJUSTE_SOLICITADO"
                      ? "A central pediu um ajuste neste pedido. Fale com a SATGF."
                      : "Este pedido foi cancelado."}
              </p>
            )}
          </DetailCard>
        }
      />
    </div>
  );
}
