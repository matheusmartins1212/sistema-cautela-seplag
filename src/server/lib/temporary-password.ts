import { randomInt } from "node:crypto";
import { isStrongPassword } from "@/shared/validation/password";

/**
 * Senha provisória gerada pela central: três blocos de quatro caracteres
 * separados por hífen (ex.: "Kq7m-R4tz-9WhP"). Sem caracteres que se
 * confundem ao ditar ou copiar (0/O, 1/l/I). Atende à política de senha e
 * vale só até o primeiro acesso, quando a troca é obrigatória.
 */
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";
const ALL = UPPER + LOWER + DIGITS;

function pick(chars: string): string {
  return chars[randomInt(chars.length)]!;
}

export function generateTemporaryPassword(): string {
  for (;;) {
    const blocks = Array.from({ length: 3 }, () =>
      Array.from({ length: 4 }, () => pick(ALL)).join(""),
    );
    const candidate = blocks.join("-");
    if (
      /[A-Z]/.test(candidate) &&
      /[a-z]/.test(candidate) &&
      /[0-9]/.test(candidate) &&
      isStrongPassword(candidate)
    ) {
      return candidate;
    }
  }
}
