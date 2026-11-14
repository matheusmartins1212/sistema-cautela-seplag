/**
 * Fuso horário oficial do sistema (Mato Grosso, sem horário de verão).
 *
 * Convenção de datas usada em todo o sistema:
 * - Horários AGENDADOS (datas/horas da solicitação, retirada e devolução
 *   previstas) são gravados como "hora de parede" de Cuiabá nos campos UTC do
 *   Date: "devolução às 17:00" vira 17:00Z. Por isso são exibidos com getUTC*.
 * - Instantes REAIS (agora, retirada/devolução efetiva, criação de registros)
 *   são instantes verdadeiros. Para exibir, use `formatInstantBr`; para comparar
 *   com um horário agendado, converta antes com `toAppWallClock`.
 */
export const APP_TIME_ZONE = "America/Cuiaba";

const wallClockParts = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Converte um instante real para a "hora de parede" de Cuiabá (campos UTC). */
export function toAppWallClock(instant: Date): Date {
  const parts = wallClockParts.formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(
    Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
      instant.getUTCMilliseconds(),
    ),
  );
}

const instantFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Formata um instante real como "dd/mm/aaaa hh:mm" no horário de Cuiabá. */
export function formatInstantBr(value: string | Date): string {
  return instantFormatter.format(new Date(value)).replace(",", "");
}

/**
 * Formata um horário agendado (gravado como relógio de Cuiabá em campo UTC)
 * como "dd/mm/aaaa hh:mm", sem conversão de fuso.
 */
export function formatWallClockBr(value: string | Date): string {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(
    d.getUTCHours(),
  )}:${pad(d.getUTCMinutes())}`;
}

/** Converte "aaaa-mm-dd" em "dd/mm/aaaa". Devolve o valor original se não casar. */
export function formatIsoDateBr(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}
