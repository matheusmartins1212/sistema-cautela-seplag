import Link from "next/link";
import { getCautionStats, getDamagesByVehicle } from "@/server/modules/reports/reports.service";
import { reportRangeSchema, toDateRange } from "@/server/modules/reports/reports.schemas";
import { formatPlate } from "@/shared/validation/plate";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export default async function AdminRelatoriosPage({ searchParams }: Props) {
  const raw = await searchParams;
  const parsed = reportRangeSchema.safeParse({
    from: str(raw.from),
    to: str(raw.to),
  });
  const input = parsed.success ? parsed.data : {};
  const range = toDateRange(input);

  const [{ vehicleUsage, bySector, byAgency, byDriver }, damages] = await Promise.all([
    getCautionStats(range),
    getDamagesByVehicle(range),
  ]);

  const exportParams = new URLSearchParams();
  if (input.from) exportParams.set("from", input.from);
  if (input.to) exportParams.set("to", input.to);
  const exportHref = (type: string) => {
    const p = new URLSearchParams(exportParams);
    p.set("type", type);
    return `/api/admin/reports/export?${p.toString()}`;
  };

  const periodLabel =
    input.from || input.to
      ? `${input.from ?? "início"} até ${input.to ?? "hoje"}`
      : "todo o período";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-institutional-900">Relatórios</h1>
        <p className="mt-1 text-sm text-gray-600">
          Indicadores de uso da frota e avarias · {periodLabel}.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-card border border-gray-200 bg-white p-4 shadow-card">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-600">De</span>
          <input
            type="date"
            name="from"
            defaultValue={input.from ?? ""}
            className="h-10 w-44 rounded-md border border-gray-300 px-3 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-600">Até</span>
          <input
            type="date"
            name="to"
            defaultValue={input.to ?? ""}
            className="h-10 w-44 rounded-md border border-gray-300 px-3 text-sm"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-md bg-institutional-800 px-4 text-sm font-semibold text-white hover:bg-institutional-700"
        >
          Aplicar período
        </button>
        <Link
          href="/admin/relatorios"
          className="inline-flex h-10 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Limpar
        </Link>
      </form>

      <ReportTable
        title="Viagens por órgão"
        subtitle="Quanto cada órgão usou a central no período."
        exportHref={exportHref("by-agency")}
        columns={["Órgão", "Viagens"]}
        rows={byAgency.map((r) => [r.agency, String(r.count)])}
        emptyLabel="Sem viagens no período."
      />

      <ReportTable
        title="Viagens por condutor"
        subtitle="Carga de trabalho de cada condutor no período."
        exportHref={exportHref("by-driver")}
        columns={["Condutor", "Viagens"]}
        rows={byDriver.map((r) => [r.driver, String(r.count)])}
        emptyLabel="Sem viagens no período."
      />

      <ReportTable
        title="Uso de veículos"
        subtitle="Viagens por veículo (mais utilizados primeiro)."
        exportHref={exportHref("vehicle-usage")}
        columns={["Veículo", "Placa", "Viagens"]}
        rows={vehicleUsage.map((r) => [r.label, formatPlate(r.plate), String(r.count)])}
        emptyLabel="Sem viagens no período."
      />

      <ReportTable
        title="Viagens por setor/lotação"
        subtitle="Distribuição das viagens por lotação do solicitante."
        exportHref={exportHref("by-sector")}
        columns={["Setor/Lotação", "Viagens"]}
        rows={bySector.map((r) => [r.department, String(r.count)])}
        emptyLabel="Sem viagens no período."
      />

      <ReportTable
        title="Avarias por veículo"
        subtitle="Quantidade de avarias registradas por veículo."
        exportHref={exportHref("damages")}
        columns={["Placa", "Avarias"]}
        rows={damages.map((r) => [formatPlate(r.plate), String(r.count)])}
        emptyLabel="Sem avarias no período."
      />
    </div>
  );
}

function ReportTable({
  title,
  subtitle,
  exportHref,
  columns,
  rows,
  emptyLabel,
}: {
  title: string;
  subtitle: string;
  exportHref: string;
  columns: string[];
  rows: string[][];
  emptyLabel: string;
}) {
  return (
    <section className="overflow-hidden rounded-card border border-gray-200 bg-white shadow-card">
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <a
          href={exportHref}
          className="shrink-0 rounded-md border border-institutional-200 bg-white px-3 py-1.5 text-xs font-semibold text-institutional-700 hover:bg-institutional-50"
        >
          Exportar CSV
        </a>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
          <tr>
            {columns.map((c, i) => (
              <th
                key={c}
                className={i === columns.length - 1 ? "px-5 py-2.5 text-right" : "px-5 py-2.5"}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-8 text-center text-sm text-gray-500">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-gray-50">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={
                      ci === row.length - 1
                        ? "px-5 py-2.5 text-right font-semibold tabular-nums text-gray-900"
                        : "px-5 py-2.5 text-gray-700"
                    }
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
