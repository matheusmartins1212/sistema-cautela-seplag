import Link from "next/link";
import { CautionStatus, VehicleCategory } from "@prisma/client";
import {
  getCalendarMonth,
  getCautionsOnDay,
  type CalendarFilters,
} from "@/server/modules/calendar/calendar.service";
import { cn } from "@/lib/cn";
import { RevealOnChange } from "@/components/calendar/reveal-on-change";
import { formatPlate } from "@/shared/validation/plate";
import { CautionStatusBadge } from "@/components/cautions/caution-status-badge";
import { CAUTION_STATUS_LABEL } from "@/components/cautions/labels";
import { VEHICLE_CATEGORY_LABEL } from "@/components/vehicles/labels";
import { toAppWallClock } from "@/shared/time";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export default async function AdminCalendarioPage({ searchParams }: Props) {
  const raw = await searchParams;
  // Mês corrente pelo calendário de Cuiabá.
  const now = toAppWallClock(new Date());

  // Mês selecionado (YYYY-MM); default mês atual.
  const monthParam = str(raw.month);
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth() + 1;
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    if (y && m && m >= 1 && m <= 12) {
      year = y;
      month = m;
    }
  }

  const categoryParam = str(raw.category);
  const statusParam = str(raw.status);
  const filters: CalendarFilters = {};
  if (categoryParam && categoryParam in VehicleCategory) {
    filters.category = categoryParam as VehicleCategory;
  }
  if (statusParam && statusParam in CautionStatus) {
    filters.status = statusParam as CautionStatus;
  }

  const calendar = await getCalendarMonth(year, month, filters);

  const selectedDay = str(raw.day);
  const dayCautions =
    selectedDay && /^\d{4}-\d{2}-\d{2}$/.test(selectedDay)
      ? await getCautionsOnDay(selectedDay, filters)
      : null;

  // Preserva filtros nas navegações.
  const filterQs = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (categoryParam) p.set("category", categoryParam);
    if (statusParam) p.set("status", statusParam);
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    return p.toString();
  };

  const monthLabel = `${MONTH_NAMES[month - 1]} de ${year}`;
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const monthValue = `${year}-${String(month).padStart(2, "0")}`;

  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const todayStr = now.toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-institutional-900">Calendário</h1>
          <p className="mt-1 text-sm text-gray-600">
            Ocupação da frota por dia e turno. Clique em um dia para ver as cautelas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            scroll={false}
            href={`/admin/calendario?${filterQs({ month: `${prev.y}-${String(prev.m).padStart(2, "0")}` })}`}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Anterior
          </Link>
          <span className="min-w-44 text-center text-sm font-semibold text-institutional-900">
            {monthLabel}
          </span>
          <Link
            scroll={false}
            href={`/admin/calendario?${filterQs({ month: `${next.y}-${String(next.m).padStart(2, "0")}` })}`}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Próximo →
          </Link>
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-card border border-gray-200 bg-white p-4 shadow-card">
        <input type="hidden" name="month" value={monthValue} />
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-600">Categoria</span>
          <select
            name="category"
            defaultValue={categoryParam ?? ""}
            className="h-10 w-44 rounded-md border border-gray-300 px-3 text-sm"
          >
            <option value="">Todas</option>
            {Object.values(VehicleCategory).map((c) => (
              <option key={c} value={c}>
                {VEHICLE_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-600">Status</span>
          <select
            name="status"
            defaultValue={statusParam ?? ""}
            className="h-10 w-52 rounded-md border border-gray-300 px-3 text-sm"
          >
            <option value="">Todos (exceto canceladas)</option>
            {Object.values(CautionStatus).map((s) => (
              <option key={s} value={s}>
                {CAUTION_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-md bg-institutional-800 px-4 text-sm font-semibold text-white hover:bg-institutional-700"
        >
          Filtrar
        </button>
        <Link
          href={`/admin/calendario?month=${monthValue}`}
          className="inline-flex h-10 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Limpar
        </Link>
      </form>

      <div className="space-y-6 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start xl:gap-6 xl:space-y-0">
        <div
          data-calendar-grid
          className="overflow-hidden rounded-card border border-gray-200 bg-white shadow-card"
        >
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">
            {WEEKDAYS.map((w) => (
              <div key={w} className="px-2 py-2">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div
                key={`blank-${i}`}
                className="min-h-24 border-b border-r border-gray-100 bg-gray-50/40"
              />
            ))}
            {calendar.days.map((d) => {
              const isToday = d.date === todayStr;
              const isSelected = d.date === selectedDay;
              return (
                <Link
                  key={d.date}
                  scroll={false}
                  aria-current={isSelected ? "date" : undefined}
                  aria-label={`${d.day} de ${MONTH_NAMES[month - 1]}: ${d.total} cautela(s)`}
                  href={`/admin/calendario?${filterQs({ month: monthValue, day: d.date })}`}
                  className={cn(
                    "min-h-24 border-b border-r border-gray-100 p-2 transition hover:bg-institutional-50",
                    isSelected && "bg-institutional-50 ring-2 ring-inset ring-institutional-400",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isToday
                          ? "flex h-6 w-6 items-center justify-center rounded-full bg-institutional-800 text-white"
                          : "text-gray-700",
                      )}
                    >
                      {d.day}
                    </span>
                    {d.total > 0 && (
                      <span className="rounded-full bg-institutional-100 px-2 text-xs font-bold text-institutional-800">
                        {d.total}
                      </span>
                    )}
                  </div>
                  {d.total > 0 && (
                    <div className="mt-1 space-y-0.5 text-[0.7rem] leading-tight text-gray-500">
                      {d.matutino > 0 && <div>Matutino: {d.matutino}</div>}
                      {d.vespertino > 0 && <div>Vespertino: {d.vespertino}</div>}
                      {d.integral > 0 && <div>Integral: {d.integral}</div>}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <RevealOnChange watch={selectedDay ?? null} className="xl:sticky xl:top-20">
          <section
            data-day-panel
            aria-live="polite"
            className="rounded-card border border-gray-200 bg-white p-5 shadow-card"
          >
            {!dayCautions ? (
              <>
                <h2 className="text-sm font-semibold text-gray-700">Cautelas do dia</h2>
                <p className="mt-3 text-sm text-gray-500">
                  Clique em um dia do calendário para ver as cautelas.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-sm font-semibold text-gray-700">
                  Cautelas em {selectedDay?.split("-").reverse().join("/")} ({dayCautions.length})
                </h2>
                {dayCautions.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">Nenhuma cautela neste dia.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-gray-100">
                    {dayCautions.map((c) => (
                      <li key={c.id} className="flex items-start justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <Link
                            href={`/admin/cautelas/${c.id}`}
                            className="font-mono text-xs font-semibold text-institutional-700 hover:underline"
                          >
                            {c.publicCode}
                          </Link>
                          <p className="truncate text-sm text-gray-800">
                            {c.vehicle.brand} {c.vehicle.model} · {formatPlate(c.vehicle.plate)}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {c.user.fullName} · {c.request.destination}
                          </p>
                        </div>
                        <CautionStatusBadge status={c.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        </RevealOnChange>
      </div>
    </div>
  );
}
