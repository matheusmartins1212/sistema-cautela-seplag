import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/modules/auth/session";
import { getUserDashboard } from "@/server/modules/dashboard/dashboard.service";
import { CautionStatusBadge } from "@/components/cautions/caution-status-badge";
import { RequestStatusBadge } from "@/components/requests/request-status-badge";
import { formatPlate } from "@/shared/validation/plate";

export const dynamic = "force-dynamic";

/** Horário de parede gravado em UTC (mesma convenção das demais telas). */
function formatDateTimeBr(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day}/${month} ${hours}:${minutes}`;
}

function formatDateBr(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

interface Card {
  label: string;
  value: number;
  href: string;
  tone: string;
}

export default async function PainelPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const firstName = session.user.fullName.split(" ")[0];
  const d = await getUserDashboard(session.user);

  const requestCards: Card[] = [
    {
      label: "Solicitações em análise",
      value: d.pendingRequests,
      href: "/solicitacoes?status=PENDENTE_ANALISE",
      tone: d.pendingRequests > 0 ? "text-warning" : "text-institutional-900",
    },
    {
      label: "Solicitações aprovadas",
      value: d.approvedRequests,
      href: "/solicitacoes?status=APROVADA",
      tone: "text-success",
    },
  ];

  const driverCards: Card[] = d.driver
    ? [
        {
          label: "Viagens programadas",
          value: d.driver.scheduledTrips,
          href: "/cautelas?status=AGUARDANDO_RETIRADA",
          tone: "text-info",
        },
        {
          label: "Em andamento",
          value: d.driver.tripsInProgress,
          href: "/cautelas?status=EM_USO",
          tone: "text-institutional-900",
        },
        {
          label: "Retornos atrasados",
          value: d.driver.overdueTrips,
          href: "/cautelas?status=ATRASADA",
          tone: d.driver.overdueTrips > 0 ? "text-danger" : "text-institutional-900",
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-institutional-900">Bem-vindo(a), {firstName}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {d.driver
              ? "Suas solicitações e as viagens em que você está com o veículo."
              : "Resumo das suas solicitações."}
          </p>
        </div>
        <Link
          href="/solicitacoes/nova"
          className="inline-flex h-11 items-center rounded-md bg-institutional-800 px-5 text-sm font-semibold text-white shadow-card hover:bg-institutional-700"
        >
          + Solicitar veículo
        </Link>
      </div>

      {d.driver && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
            Minhas viagens
          </h2>
          <CardGrid cards={driverCards} />
          <div className="rounded-card border border-gray-200 bg-white shadow-card">
            <div className="border-b border-gray-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-700">Próximas viagens</h3>
            </div>
            {d.driver.nextTrips.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500">
                Nenhuma viagem programada com você.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {d.driver.nextTrips.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/cautelas/${c.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-institutional-700">
                          {formatDateTimeBr(c.plannedWithdrawalAt)} ·{" "}
                          <span className="font-mono">{c.publicCode}</span>
                        </span>
                        <p className="truncate text-sm text-gray-800">
                          {c.request.origin ? `${c.request.origin} → ` : ""}
                          {c.request.destination}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {c.vehicle.brand} {c.vehicle.model} · {formatPlate(c.vehicle.plate)}
                        </p>
                      </div>
                      <CautionStatusBadge status={c.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <section className="space-y-4">
        {d.driver && (
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
            Minhas solicitações
          </h2>
        )}
        <CardGrid cards={requestCards} />
        <div className="rounded-card border border-gray-200 bg-white shadow-card">
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-700">Solicitações recentes</h3>
          </div>
          {d.recentRequests.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">
              Você ainda não fez solicitações. Comece por{" "}
              <Link
                href="/solicitacoes/nova"
                className="font-medium text-institutional-700 hover:underline"
              >
                Solicitar veículo
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {d.recentRequests.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/solicitacoes/${r.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <span className="font-mono text-xs font-semibold text-institutional-700">
                        {r.publicCode}
                      </span>
                      <p className="truncate text-sm text-gray-800">
                        {formatDateBr(r.withdrawalDate)} {r.withdrawalTime} · {r.destination}
                      </p>
                    </div>
                    <RequestStatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function CardGrid({ cards }: { cards: Card[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      {cards.map((c) => (
        <Link
          key={c.label}
          href={c.href}
          className="rounded-card border border-gray-200 bg-white p-5 shadow-card transition hover:border-institutional-300 hover:shadow-md"
        >
          <p className="text-sm font-medium text-gray-600">{c.label}</p>
          <p className={`mt-2 text-3xl font-bold tabular-nums ${c.tone}`}>{c.value}</p>
        </Link>
      ))}
    </div>
  );
}
