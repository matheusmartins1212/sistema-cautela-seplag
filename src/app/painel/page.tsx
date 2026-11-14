import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/modules/auth/session";
import { getUserDashboard } from "@/server/modules/dashboard/dashboard.service";
import { CautionStatusBadge } from "@/components/cautions/caution-status-badge";
import { formatPlate } from "@/shared/validation/plate";

export const dynamic = "force-dynamic";

export default async function PainelPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const firstName = session.user.fullName.split(" ")[0];
  const d = await getUserDashboard(session.user.id);

  const cards: Array<{ label: string; value: number; href: string; tone: string }> = [
    {
      label: "Solicitações pendentes",
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
    {
      label: "Cautelas em andamento",
      value: d.activeCautions,
      href: "/cautelas",
      tone: "text-info",
    },
    {
      label: "Cautelas atrasadas",
      value: d.overdueCautions,
      href: "/cautelas?status=ATRASADA",
      tone: d.overdueCautions > 0 ? "text-danger" : "text-institutional-900",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-institutional-900">Bem-vindo(a), {firstName}</h1>
          <p className="mt-1 text-sm text-gray-600">Resumo das suas solicitações e cautelas.</p>
        </div>
        <Link
          href="/solicitacoes/nova"
          className="inline-flex h-11 items-center rounded-md bg-institutional-800 px-5 text-sm font-semibold text-white shadow-card hover:bg-institutional-700"
        >
          + Solicitar veículo
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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

      <section className="rounded-card border border-gray-200 bg-white shadow-card">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-700">Cautelas recentes</h2>
        </div>
        {d.recentCautions.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            Você ainda não possui cautelas. Comece solicitando um veículo.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {d.recentCautions.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/cautelas/${c.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-semibold text-institutional-700">
                      {c.publicCode}
                    </span>
                    <p className="truncate text-sm text-gray-800">
                      {c.vehicle.brand} {c.vehicle.model} · {formatPlate(c.vehicle.plate)}
                    </p>
                  </div>
                  <CautionStatusBadge status={c.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
