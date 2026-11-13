/** Concatena classes condicionais (utilitário leve, sem dependências). */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
