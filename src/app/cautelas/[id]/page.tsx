import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/server/modules/auth/session";
import { getCautionById } from "@/server/modules/cautions/caution.service";
import { toPublicCaution } from "@/server/modules/cautions/caution.dto";
import { Errors } from "@/server/lib/errors";
import { CautionStatusBadge } from "@/components/cautions/caution-status-badge";
import { ChecklistActions } from "@/components/checklists/checklist-actions";
import { responsibleUserId } from "@/server/modules/cautions/responsible";
import {
  DetailCard,
  DetailHeader,
  DetailLayout,
  Fact,
  Facts,
  RelatedItem,
  RelatedList,
} from "@/components/ui/detail";
import { modalityLabel, passengersText } from "@/components/requests/trip-text";
import {
  currentYearCuiaba,
  formatInstantDateTime,
  formatWallClockPeriod,
  shortCode,
} from "@/shared/format";
import { formatPhoneBr } from "@/shared/phone";

interface Props {
  params: Promise<{ id: string }>;
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
  const year = currentYearCuiaba();
  // Quem conduz preenche os checklists; o solicitante apenas acompanha.
  const isResponsible = responsibleUserId(cautionRaw) === session.user.id;
  const isRequester = cautionRaw.userId === session.user.id;
  const isDriver = c.driver?.id === session.user.id;

  const passengers = passengersText(
    c.request?.passengerNames ?? null,
    c.request?.passengerCount ?? null,
  );
  const contact = c.request?.contactPhone ?? c.user?.phone ?? null;

  return (
    <div className="space-y-6">
      <DetailHeader
        backHref={isResponsible ? "/cautelas" : "/solicitacoes"}
        backLabel={isResponsible ? "Minhas viagens" : "Minhas solicitações"}
        title={c.request?.destination ?? "Viagem"}
        code={shortCode(c.publicCode)}
        codeTitle={c.publicCode}
        badges={<CautionStatusBadge status={c.status} />}
        meta={`${formatWallClockPeriod(c.plannedWithdrawalAt, c.plannedReturnAt, year)} · ${modalityLabel(Boolean(c.driver), isRequester)}`}
        actions={isResponsible && <ChecklistActions cautionId={c.id} status={c.status} />}
      />

      <DetailLayout
        main={
          <DetailCard title="Viagem">
            <Facts>
              {c.actualWithdrawalAt && (
                <>
                  <Fact label="Saída efetiva">
                    {formatInstantDateTime(c.actualWithdrawalAt, year)}
                  </Fact>
                  <Fact label="Retorno efetivo">
                    {c.actualReturnAt
                      ? formatInstantDateTime(c.actualReturnAt, year)
                      : "Ainda em viagem"}
                  </Fact>
                </>
              )}
              {c.request?.origin && <Fact label="Local de saída">{c.request.origin}</Fact>}
              {c.request?.requestingAgency && (
                <Fact label="Órgão solicitante">{c.request.requestingAgency}</Fact>
              )}
              {passengers && <Fact label="Passageiros">{passengers}</Fact>}
              {c.request && (
                <Fact label="Finalidade" wide>
                  {c.request.reason}
                </Fact>
              )}
              {c.finalNotes && (
                <Fact label="Observação de encerramento" wide>
                  {c.finalNotes}
                </Fact>
              )}
            </Facts>
          </DetailCard>
        }
        aside={
          <DetailCard title="Envolvidos">
            <RelatedList>
              {c.user && !isRequester && (
                <RelatedItem
                  label="Solicitante"
                  title={c.user.fullName}
                  detail={contact ? `Contato no dia: ${formatPhoneBr(contact)}` : undefined}
                />
              )}
              {c.driver ? (
                <RelatedItem
                  label="Condutor"
                  title={isDriver ? "Você" : c.driver.fullName}
                  detail={isDriver ? undefined : formatPhoneBr(c.driver.phone)}
                />
              ) : (
                <RelatedItem
                  label="Quem dirige"
                  title={isRequester ? "Você" : "O próprio solicitante"}
                />
              )}
              {c.vehicle && (
                <RelatedItem
                  label="Veículo"
                  title={`${c.vehicle.brand} ${c.vehicle.model}`}
                  detail={<span className="font-mono">{c.vehicle.plateFormatted}</span>}
                />
              )}
              {c.request && isRequester && (
                <RelatedItem
                  label="Solicitação"
                  title={<span className="font-mono">{shortCode(c.request.publicCode)}</span>}
                  href={`/solicitacoes/${c.request.id}`}
                />
              )}
            </RelatedList>
          </DetailCard>
        }
      />
    </div>
  );
}
