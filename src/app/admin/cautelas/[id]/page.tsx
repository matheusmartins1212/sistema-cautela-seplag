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
  const year = currentYearCuiaba();

  const checklists = await prisma.checklist.findMany({
    where: { cautionId: c.id },
    select: { id: true, type: true, status: true, submittedAt: true },
    orderBy: { createdAt: "asc" },
  });

  const passengers = passengersText(
    c.request?.passengerNames ?? null,
    c.request?.passengerCount ?? null,
  );
  const agency = c.request?.requestingAgency ?? c.user?.agency ?? null;
  const contactPhone = c.request?.contactPhone;
  const showContact = contactPhone && contactPhone !== c.user?.phone;

  return (
    <div className="space-y-6">
      <DetailHeader
        backHref="/admin/cautelas"
        backLabel="Viagens"
        title={c.request?.destination ?? "Viagem"}
        code={shortCode(c.publicCode)}
        codeTitle={c.publicCode}
        badges={<CautionStatusBadge status={c.status} />}
        meta={`${formatWallClockPeriod(c.plannedWithdrawalAt, c.plannedReturnAt, year)} · ${modalityLabel(Boolean(c.driver))}`}
        actions={
          isCautionCancellable(c.status) && (
            <CancelCautionButton
              cautionId={c.id}
              publicCode={c.publicCode}
              vehicleOut={isVehicleOut(c.status)}
            />
          )
        }
      />

      <DetailLayout
        main={
          <>
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
                {agency && <Fact label="Órgão solicitante">{agency}</Fact>}
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

            <DetailCard title="Checklists">
              {checklists.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum checklist iniciado ainda.</p>
              ) : (
                <RelatedList>
                  {checklists.map((cl) => (
                    <RelatedItem
                      key={cl.id}
                      label={`Checklist de ${CHECKLIST_TYPE_LABEL[cl.type].toLowerCase()}`}
                      title={
                        cl.submittedAt
                          ? `Enviado em ${formatInstantDateTime(cl.submittedAt, year)}`
                          : "Ainda não enviado"
                      }
                      href={`/admin/checklists/${cl.id}`}
                      badge={<ChecklistStatusBadge status={cl.status} />}
                    />
                  ))}
                </RelatedList>
              )}
            </DetailCard>
          </>
        }
        aside={
          <DetailCard title="Envolvidos">
            <RelatedList>
              {c.user && (
                <RelatedItem
                  label="Solicitante"
                  title={c.user.fullName}
                  detail={
                    <>
                      {formatPhoneBr(c.user.phone)}
                      {showContact && (
                        <span className="block">Contato no dia: {formatPhoneBr(contactPhone)}</span>
                      )}
                    </>
                  }
                  href={`/admin/usuarios/${c.user.id}`}
                />
              )}
              {c.driver ? (
                <RelatedItem
                  label="Condutor"
                  title={c.driver.fullName}
                  detail={formatPhoneBr(c.driver.phone)}
                  href={`/admin/usuarios/${c.driver.id}`}
                />
              ) : (
                <RelatedItem label="Condutor" title="O próprio solicitante dirige" />
              )}
              {c.vehicle && (
                <RelatedItem
                  label="Veículo"
                  title={`${c.vehicle.brand} ${c.vehicle.model}`}
                  detail={<span className="font-mono">{c.vehicle.plateFormatted}</span>}
                  href={`/admin/veiculos/${c.vehicle.id}`}
                />
              )}
              {c.request && (
                <RelatedItem
                  label="Solicitação"
                  title={<span className="font-mono">{shortCode(c.request.publicCode)}</span>}
                  href={`/admin/solicitacoes/${c.request.id}`}
                />
              )}
            </RelatedList>
          </DetailCard>
        }
      />
    </div>
  );
}
