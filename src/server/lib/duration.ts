/**
 * Conversão de strings de duração (ex.: "24h", "30m", "45s", "7d") para
 * milissegundos. Usado para expiração de tokens de e-mail/reset.
 */
const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDurationToMs(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(value.trim());
  if (!match) {
    throw new Error(`Duração inválida: "${value}". Use formatos como "30m", "24h", "7d".`);
  }
  const amount = Number(match[1]);
  const unit = match[2]!.toLowerCase();
  return amount * UNIT_MS[unit]!;
}

/** Retorna um Date no futuro somando a duração a partir de agora. */
export function expiresAt(duration: string, from: Date = new Date()): Date {
  return new Date(from.getTime() + parseDurationToMs(duration));
}
