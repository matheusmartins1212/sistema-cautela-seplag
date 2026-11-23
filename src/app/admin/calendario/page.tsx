import Link from "next/link";
import { CautionStatus, VehicleCategory } from "@prisma/client";
import {
  getCalendarMonth,
  getCautionsOnDay,
  type CalendarDay,
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
const WEEKDAY_NAMES = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

/** Turnos, na ordem do dia, com a cor usada no calendário e no painel. */
const PERIODS = [
  { key: "matutino", label: "Matutino", dot: "bg-amber-400" },
  { key: "vespertino", label: "Vespertino", dot: "bg-sky-500" },
  { key: "integral", label: "Integral", dot: "bg-institutional-600" },
] as const;

type PeriodCounts = Pick<CalendarDay, "matutino" | "vespertino" | "integral">;

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function plural(n: number): string {
  return n === 1 ? "viagem" : "viagens";
}

function brDate(d: Date): string {
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`;
}

export default async function AdminCalendarioPage({ searchParams }: Props) {
  const raw = await searchParams;
  // "Hoje" pelo relógio de Cuiabá.
  const now = toAppWallClock(new Date());
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonthValue = todayStr.slice(0, 7);

  // Mês selecionado (YYYY-MM); padrão: mês atual.
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
  const monthValue = `${year}-${pad(month)}`;

  const categoryParam = str(raw.category);
  const statusParam = str(raw.status);
  const filters: CalendarFilters = {};
  if (categoryParam && categoryParam in VehicleCategory) {
    filters.category = categoryParam as VehicleCategory;
  }
  if (statusParam && statusParam in CautionStatus) {
    filters.status = statusParam as CautionStatus;
  }

  // Dia aberto no painel: o escolhido ou, no mês atual, o dia de hoje.
  const dayParam = str(raw.day);
  const selectedDay =
    dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam)
      ? dayParam
      : monthValue === currentMonthValue
        ? todayStr
        : undefined;

  const [calendar, dayCautions] = await Promise.all([
    getCalendarMonth(year, month, filters),
    selectedDay ? getCautionsOnDay(selectedDay, filters) : Promise.resolve(null),
  ]);

  // Preserva filtros nas navegações.
  const filterQs = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (categoryParam) p.set("category", categoryParam);
    if (statusParam) p.set("status", statusParam);
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    return p.toString();
  };

  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const monthTotal = calendar.days.reduce((acc, d) => acc + d.total, 0);
  const onToday = selectedDay === todayStr;

  // Turnos do dia aberto: do próprio calendário quando o dia está no mês exibido.
  const selectedCounts: PeriodCounts | null = selectedDay
    ? (calendar.days.find((d) => d.date === selectedDay) ??
      (dayCautions
        ? {
            matutino: dayCautions.filter((c) => c.request.shift === "MATUTINO").length,
            vespertino: dayCautions.filter((c) => c.request.shift === "VESPERTINO").length,
            integral: dayCautions.filter((c) => c.request.shift === "INTEGRAL").length,
          }
        : null))
    : null;

  let selectedTitle: { weekday: string; date: string } | null = null;
  if (selectedDay) {
    const [sy, sm, sd] = selectedDay.split("-").map(Number);
    const wd = new Date(Date.UTC(sy!, sm! - 1, sd!)).getUTCDay();
    selectedTitle = {
      weekday: WEEKDAY_NAMES[wd]!,
      date: `${sd} de ${MONTH_NAMES[sm! - 1]!.toLowerCase()} de ${sy}`,
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-institutional-900">Calendário</h1>
        <p className="mt-1 text-sm text-gray-600">
          Viagens programadas por dia. Passe o mouse sobre um dia para ver os turnos e clique para
          ver as viagens.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-card border border-gray-200 bg-white p-4 shadow-card">
        <input type="hidden" name="month" value={monthValue} />
        {dayParam && <input type="hidden" name="day" value={dayParam} />}
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

      <div className="space-y-6 xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start xl:gap-6 xl:space-y-0">
        <div
          data-calendar-grid
          className="rounded-card border border-gray-200 bg-white shadow-card"
        >
          {/* Cabeçalho do calendário: mês e navegação */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-1">
              <MonthArrow
                href={`/admin/calendario?${filterQs({ month: `${prev.y}-${pad(prev.m)}` })}`}
                label="Mês anterior"
                direction="prev"
              />
              <h2 className="min-w-[11.5rem] text-center text-lg font-semibold tracking-tight text-institutional-900">
                {MONTH_NAMES[month - 1]} <span className="font-normal text-gray-400">{year}</span>
              </h2>
              <MonthArrow
                href={`/admin/calendario?${filterQs({ month: `${next.y}-${pad(next.m)}` })}`}
                label="Próximo mês"
                direction="next"
              />
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-500">
                <span className="font-semibold tabular-nums text-gray-900">{monthTotal}</span>{" "}
                {plural(monthTotal)} no mês
              </p>
              <Link
                scroll={false}
                href={`/admin/calendario?${filterQs({ month: currentMonthValue, day: todayStr })}`}
                aria-disabled={onToday}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                  onToday
                    ? "pointer-events-none border-gray-200 text-gray-400"
                    : "border-institutional-200 text-institutional-800 hover:bg-institutional-50",
                )}
              >
                Hoje
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-7 px-3 pb-1 pt-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            {WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 p-3 pt-1">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`blank-${i}`} aria-hidden="true" />
            ))}
            {calendar.days.map((d, i) => {
              const isToday = d.date === todayStr;
              const isSelected = d.date === selectedDay;
              const isPast = d.date < todayStr;
              const weekday = (firstWeekday + i) % 7;
              const isWeekend = weekday === 0 || weekday === 6;
              const hasTrips = d.total > 0;
              const breakdown = PERIODS.map((p) => `${p.label}: ${d[p.key]}`).join(", ");
              return (
                <Link
                  key={d.date}
                  scroll={false}
                  data-day={d.date}
                  aria-current={isSelected ? "date" : undefined}
                  aria-label={
                    hasTrips
                      ? `${d.day} de ${MONTH_NAMES[month - 1]}: ${d.total} ${plural(d.total)} (${breakdown})`
                      : `${d.day} de ${MONTH_NAMES[month - 1]}: nenhuma viagem`
                  }
                  href={`/admin/calendario?${filterQs({ month: monthValue, day: d.date })}`}
                  className={cn(
                    "group relative flex min-h-[5.25rem] flex-col justify-between rounded-lg border p-2 outline-none transition sm:p-2.5",
                    "focus-visible:ring-2 focus-visible:ring-institutional-500",
                    hasTrips
                      ? "border-institutional-100 bg-institutional-50/70 hover:border-institutional-300 hover:bg-institutional-50"
                      : "border-transparent hover:border-gray-200 hover:bg-gray-50",
                    isSelected &&
                      "border-institutional-600 bg-white shadow-sm ring-1 ring-institutional-600 hover:border-institutional-600 hover:bg-white",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-sm tabular-nums",
                      isToday
                        ? "bg-institutional-800 font-semibold text-white"
                        : isPast || isWeekend
                          ? "text-gray-400"
                          : "font-medium text-gray-700",
                    )}
                  >
                    {d.day}
                  </span>

                  {hasTrips && (
                    <span className="flex items-baseline gap-1 self-end sm:self-start">
                      <span className="text-xl font-bold tabular-nums leading-none text-institutional-800 sm:text-2xl">
                        {d.total}
                      </span>
                      <span className="hidden text-[11px] font-medium text-institutional-700/80 sm:inline">
                        {plural(d.total)}
                      </span>
                    </span>
                  )}

                  {hasTrips && (
                    <span
                      role="tooltip"
                      className={cn(
                        // Só com mouse (sm+); no toque, os turnos aparecem no painel do dia.
                        "pointer-events-none absolute bottom-full z-30 mb-2 hidden w-max translate-y-1 rounded-lg bg-gray-900 px-3 py-2.5 text-left text-xs text-white opacity-0 shadow-lg transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 sm:block",
                        // Nas colunas das pontas, ancora na borda para não sair da tela.
                        weekday === 0
                          ? "left-0"
                          : weekday === 6
                            ? "right-0"
                            : "left-1/2 -translate-x-1/2",
                      )}
                    >
                      <span className="mb-1.5 block font-semibold">
                        {d.day} de {MONTH_NAMES[month - 1]!.toLowerCase()}
                      </span>
                      {PERIODS.map((p) => (
                        <span
                          key={p.key}
                          className={cn(
                            "flex items-center gap-2 py-0.5",
                            d[p.key] === 0 && "text-gray-500",
                          )}
                        >
                          <span className={cn("h-2 w-2 rounded-full", p.dot)} />
                          <span className="flex-1">{p.label}</span>
                          <span className="pl-4 font-semibold tabular-nums">{d[p.key]}</span>
                        </span>
                      ))}
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute top-full -mt-1 h-2 w-2 rotate-45 bg-gray-900",
                          weekday === 0
                            ? "left-4"
                            : weekday === 6
                              ? "right-4"
                              : "left-1/2 -translate-x-1/2",
                        )}
                      />
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <RevealOnChange watch={selectedDay ?? null} className="xl:sticky xl:top-6">
          <section
            data-day-panel
            aria-live="polite"
            className="overflow-hidden rounded-card border border-gray-200 bg-white shadow-card"
          >
            {!selectedTitle || !dayCautions ? (
              <div className="p-6">
                <h2 className="text-sm font-semibold text-gray-700">Viagens do dia</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Escolha um dia no calendário para ver as viagens.
                </p>
              </div>
            ) : (
              <>
                <div className="border-b border-gray-100 bg-gradient-to-br from-institutional-50 to-white px-6 py-5">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-institutional-700">
                      {selectedTitle.weekday}
                    </p>
                    {selectedDay === todayStr && (
                      <span className="rounded-full bg-institutional-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        Hoje
                      </span>
                    )}
                  </div>
                  <h2 className="mt-1 text-lg font-semibold text-institutional-900">
                    {selectedTitle.date}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {dayCautions.length === 0
                      ? "Nenhuma viagem programada"
                      : `${dayCautions.length} ${plural(dayCautions.length)} ${dayCautions.length === 1 ? "programada" : "programadas"}`}
                  </p>
                  {selectedCounts && dayCautions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {PERIODS.filter((p) => selectedCounts[p.key] > 0).map((p) => (
                        <span
                          key={p.key}
                          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700"
                        >
                          <span className={cn("h-2 w-2 rounded-full", p.dot)} />
                          {p.label}
                          <span className="font-semibold tabular-nums">
                            {selectedCounts[p.key]}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {dayCautions.length === 0 ? (
                  <p className="px-6 py-8 text-center text-sm text-gray-500">
                    Dia livre: nenhum veículo programado.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {dayCautions.map((c) => {
                      const sameDay =
                        c.request.withdrawalDate.getTime() === c.request.returnDate.getTime();
                      const when = sameDay
                        ? `${c.request.withdrawalTime} às ${c.request.returnTime}`
                        : `${brDate(c.request.withdrawalDate)} ${c.request.withdrawalTime} a ${brDate(c.request.returnDate)} ${c.request.returnTime}`;
                      return (
                        <li key={c.id}>
                          <Link
                            href={`/admin/cautelas/${c.id}`}
                            className="block px-6 py-4 transition hover:bg-gray-50"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold tabular-nums text-gray-900">
                                {when}
                              </p>
                              <CautionStatusBadge status={c.status} />
                            </div>
                            <p className="mt-1 truncate text-sm text-gray-800">
                              {c.vehicle.brand} {c.vehicle.model} ·{" "}
                              <span className="font-mono text-xs">
                                {formatPlate(c.vehicle.plate)}
                              </span>
                            </p>
                            <p className="mt-0.5 truncate text-xs text-gray-500">
                              {c.request.requestingAgency ?? c.user.fullName} →{" "}
                              {c.request.destination}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-gray-500">
                              {c.driver
                                ? `Condutor: ${c.driver.fullName}`
                                : `Dirige: ${c.user.fullName}`}
                            </p>
                            <p className="mt-1 font-mono text-[11px] text-institutional-700">
                              {c.publicCode}
                            </p>
                          </Link>
                        </li>
                      );
                    })}
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

function MonthArrow({
  href,
  label,
  direction,
}: {
  href: string;
  label: string;
  direction: "prev" | "next";
}) {
  return (
    <Link
      scroll={false}
      href={href}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-institutional-50 hover:text-institutional-800"
    >
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
        <path
          d={direction === "prev" ? "M12.5 15 7.5 10l5-5" : "M7.5 5l5 5-5 5"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
