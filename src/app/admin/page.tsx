import Link from "next/link";
import { CautionStatus, VehicleStatus } from "@prisma/client";
import { getAdminDashboard } from "@/server/modules/dashboard/dashboard.service";
import { cn } from "@/lib/cn";
import { VEHICLE_STATUS_LABEL } from "@/components/vehicles/labels";
import { CAUTION_STATUS_LABEL } from "@/components/cautions/labels";

export const dynamic = "force-dynamic";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "text-institutional-900",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export default async function AdminDashboardPage() {
  const d = await getAdminDashboard();

  const cards: Array<{
    label: string;
    value: number;
    href: string;
    tone: Tone;
    highlightWhenPositive?: boolean;
  }> = [
    {
      label: "Solicitações pendentes",
      value: d.requests.pending,
      href: "/admin/solicitacoes?status=PENDENTE_ANALISE",
      tone: d.requests.pending > 0 ? "warning" : "neutral",
    },
    {
      label: "Viagens ativas",
      value: d.cautions.active,
      href: "/admin/cautelas",
      tone: "info",
    },
    {
      label: "Viagens atrasadas",
      value: d.cautions.overdue,
      href: "/admin/cautelas?status=ATRASADA",
      tone: d.cautions.overdue > 0 ? "danger" : "neutral",
    },
    {
      label: "Avarias abertas",
      value: d.damages.open,
      href: "/admin/avarias",
      tone: d.damages.open > 0 ? "warning" : "neutral",
    },
    {
      label: "Veículos disponíveis",
      value: d.vehicles.available,
      href: "/admin/veiculos",
      tone: "success",
    },
    {
      label: "Total de veículos",
      value: d.vehicles.total,
      href: "/admin/veiculos",
      tone: "neutral",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-institutional-900">Painel</h1>
        <p className="mt-1 text-sm text-gray-600">
          Visão geral da operação. Clique em um indicador para ver os detalhes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-card border border-gray-200 bg-white p-5 shadow-card transition hover:border-institutional-300 hover:shadow-md"
          >
            <p className="text-sm font-medium text-gray-600">{c.label}</p>
            <p className={cn("mt-2 text-3xl font-bold tabular-nums", TONE_CLASSES[c.tone])}>
              {c.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BreakdownCard
          title="Frota por status"
          entries={Object.values(VehicleStatus)
            .map((s) => ({ label: VEHICLE_STATUS_LABEL[s], count: d.vehicles.byStatus[s] }))
            .filter((e) => e.count > 0)}
          emptyLabel="Nenhum veículo cadastrado."
        />
        <BreakdownCard
          title="Viagens por status"
          entries={Object.values(CautionStatus)
            .map((s) => ({ label: CAUTION_STATUS_LABEL[s], count: d.cautions.byStatus[s] }))
            .filter((e) => e.count > 0)}
          emptyLabel="Nenhuma viagem registrada."
        />
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  entries,
  emptyLabel,
}: {
  title: string;
  entries: Array<{ label: string; count: number }>;
  emptyLabel: string;
}) {
  return (
    <section className="rounded-card border border-gray-200 bg-white p-5 shadow-card">
      <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">{emptyLabel}</p>
      ) : (
        <dl className="mt-3 divide-y divide-gray-100">
          {entries.map((e) => (
            <div key={e.label} className="flex items-center justify-between py-2 text-sm">
              <dt className="text-gray-600">{e.label}</dt>
              <dd className="font-semibold tabular-nums text-gray-900">{e.count}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
