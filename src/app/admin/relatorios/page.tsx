import { getCautionStats, getDamagesByVehicle } from "@/server/modules/reports/reports.service";
import { reportRangeSchema, toDateRange } from "@/server/modules/reports/reports.schemas";
import { formatPlate } from "@/shared/validation/plate";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar, FilterField, filterControlClass } from "@/components/ui/filter-bar";

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
      <PageHeader title="Relatórios" description={`Uso da frota e avarias · ${periodLabel}`} />

      <FilterBar clearHref="/admin/relatorios" submitLabel="Aplicar">
        <FilterField label="De">
          <input
            type="date"
            name="from"
            defaultValue={input.from ?? ""}
            className={filterControlClass}
          />
        </FilterField>
        <FilterField label="Até">
          <input
            type="date"
            name="to"
            defaultValue={input.to ?? ""}
            className={filterControlClass}
          />
        </FilterField>
      </FilterBar>

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
        <thead className="border-b border-gray-200 bg-gray-50/80">
          <tr>
            {columns.map((c, i) => (
              <th
                key={c}
                scope="col"
                className={
                  "whitespace-nowrap px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 " +
                  (i === columns.length - 1 ? "text-right" : "text-left")
                }
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
              <tr key={ri} className="transition-colors hover:bg-gray-50/60">
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
