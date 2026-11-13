import { randomInt } from "node:crypto";

/**
 * Geração de códigos públicos únicos para solicitações e cautelas.
 *
 * Formato: PREFIXO-AAAA-MM-DD-XXXXXXXX
 *   ex.: SOL-2026-06-09-7K3P9QF2
 *
 * O sufixo aleatório evita enumeração sequencial (IDOR / scraping), conforme
 * seção 15 da especificação. A unicidade final é garantida pela constraint
 * UNIQUE no banco; o chamador deve repetir em caso de colisão (raríssima).
 */

// Alfabeto sem caracteres ambíguos (0/O, 1/I/L) para legibilidade humana.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const SUFFIX_LENGTH = 8;

export type PublicCodePrefix = "SOL" | "CTL";

function randomSuffix(length = SUFFIX_LENGTH): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

export function generatePublicCode(prefix: PublicCodePrefix, date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${prefix}-${yyyy}-${mm}-${dd}-${randomSuffix()}`;
}

/** Código de solicitação (ex.: SOL-2026-06-09-7K3P9QF2). */
export const generateRequestCode = (date?: Date) => generatePublicCode("SOL", date);

/** Código de cautela (ex.: CTL-2026-06-09-7K3P9QF2). */
export const generateCautionCode = (date?: Date) => generatePublicCode("CTL", date);

const PUBLIC_CODE_REGEX = /^(SOL|CTL)-\d{4}-\d{2}-\d{2}-[A-Z2-9]{8}$/;

export function isValidPublicCode(code: string): boolean {
  return PUBLIC_CODE_REGEX.test(code);
}
