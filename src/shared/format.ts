/** Formatação curta e padronizada usada nas listas e nas telas de detalhe. */

import { toAppWallClock } from "./time";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "3 viagens", "1 viagem". */
export function countLabel(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function splitIso(iso: string): { d: string; m: string; y: string } {
  const [y = "", m = "", d = ""] = iso.slice(0, 10).split("-");
  return { d, m, y };
}

/**
 * Período numa linha: "18/11/2026, 13:00–17:30" no mesmo dia;
 * "15/11/2026 07:30 – 16/11 18:00" em dias diferentes. Com `currentYear`,
 * o ano some quando é o ano corrente ("18/11, 13:00–17:30").
 */
export function formatPeriod(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
  currentYear?: number,
): string {
  const s = splitIso(startDate);
  const e = splitIso(endDate);
  const sameYearAsNow = currentYear !== undefined && Number(s.y) === currentYear;
  const startDay = sameYearAsNow ? `${s.d}/${s.m}` : `${s.d}/${s.m}/${s.y}`;
  if (startDate.slice(0, 10) === endDate.slice(0, 10)) {
    return `${startDay}, ${startTime}–${endTime}`;
  }
  const endPart = s.y === e.y ? `${e.d}/${e.m}` : `${e.d}/${e.m}/${e.y}`;
  return `${startDay} ${startTime} – ${endPart} ${endTime}`;
}

/**
 * Mesmo formato a partir de instantes gravados como relógio de Cuiabá em UTC
 * (horários agendados das viagens).
 */
export function formatWallClockPeriod(
  startIso: string | Date,
  endIso: string | Date,
  currentYear?: number,
): string {
  const a = new Date(startIso);
  const b = new Date(endIso);
  const date = (d: Date) =>
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const time = (d: Date) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  return formatPeriod(date(a), time(a), date(b), time(b), currentYear);
}

/** Ano corrente em Cuiabá (UTC-4), para omitir o ano nas datas das listas. */
export function currentYearCuiaba(now: Date = new Date()): number {
  return new Date(now.getTime() - 4 * 3_600_000).getUTCFullYear();
}

/** Parte final do código público (ex.: "ZTRN2P9D" de "SOL-2026-11-13-ZTRN2P9D"). */
export function shortCode(publicCode: string): string {
  return publicCode.split("-").pop() ?? publicCode;
}

function dayMonth(y: number, m: number, d: number, currentYear?: number): string {
  return currentYear !== undefined && y === currentYear
    ? `${pad(d)}/${pad(m)}`
    : `${pad(d)}/${pad(m)}/${y}`;
}

/**
 * Data e hora numa expressão só, como nas telas de detalhe: "02/12 às 09:00"
 * (ano omitido quando é o corrente). Recebe a data "aaaa-mm-dd" e a hora "hh:mm".
 */
export function formatDateTimeParts(date: string, time: string, currentYear?: number): string {
  const { d, m, y } = splitIso(date);
  return `${dayMonth(Number(y), Number(m), Number(d), currentYear)} às ${time}`;
}

/** Mesmo formato para horários agendados (relógio de Cuiabá gravado em UTC). */
export function formatWallClockDateTime(iso: string | Date, currentYear?: number): string {
  const v = new Date(iso);
  return `${dayMonth(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate(), currentYear)} às ${pad(
    v.getUTCHours(),
  )}:${pad(v.getUTCMinutes())}`;
}

/** Mesmo formato para instantes reais (convertidos para Cuiabá, UTC-4). */
export function formatInstantDateTime(iso: string | Date, currentYear?: number): string {
  return formatWallClockDateTime(toAppWallClock(new Date(iso)).toISOString(), currentYear);
}

/** Quilometragem com separador de milhar: "60.085 km". */
export function formatKm(km: number): string {
  return `${km.toLocaleString("pt-BR")} km`;
}
