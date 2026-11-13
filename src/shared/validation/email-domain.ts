/**
 * Normalização e validação de e-mail institucional.
 *
 * Regra (seção 5.2 da especificação): apenas e-mails cujo domínio seja
 * EXATAMENTE o domínio institucional permitido podem concluir cadastro.
 * Deve rejeitar spoofings como:
 *   - usuario@seplag.mt.gov.br.fake.com
 *   - usuario@seplag.mt.gov.br@gmail.com
 *   - espaços / caracteres invisíveis
 *   - diferenças de caixa
 */

// Caracteres invisíveis / de controle / zero-width que poderiam mascarar spoof:
// controle C0/C1, NBSP, zero-width space/non-joiner/joiner, word joiner e BOM.
// Construído a partir de code points para manter a fonte 100% ASCII.
const INVISIBLE_CODE_POINTS: ReadonlyArray<[number, number]> = [
  [0x0000, 0x001f], // C0 control
  [0x007f, 0x009f], // DEL + C1 control
  [0x00a0, 0x00a0], // NBSP
  [0x200b, 0x200d], // zero-width space / non-joiner / joiner
  [0x2060, 0x2060], // word joiner
  [0xfeff, 0xfeff], // BOM / zero-width no-break space
];

const hex = (n: number) => `\\u${n.toString(16).padStart(4, "0")}`;

const INVISIBLE_CHARS = new RegExp(
  "[" +
    INVISIBLE_CODE_POINTS.map(([from, to]) =>
      from === to ? hex(from) : `${hex(from)}-${hex(to)}`,
    ).join("") +
    "]",
  "g",
);

/** Normaliza: remove invisíveis, faz trim e lowercase. */
export function normalizeEmail(value: string): string {
  return value.replace(INVISIBLE_CHARS, "").trim().toLowerCase();
}

// E-mail simples e estrito: exatamente um "@", sem espaços, domínio com ponto.
const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

export function isValidEmailFormat(value: string): boolean {
  const email = normalizeEmail(value);
  // Garante exatamente um "@" (rejeita ...@gmail.com com duplo @).
  if ((email.match(/@/g) ?? []).length !== 1) return false;
  return EMAIL_REGEX.test(email);
}

/** Extrai o domínio (parte após o único "@") de um e-mail já normalizado. */
export function getEmailDomain(value: string): string | null {
  const email = normalizeEmail(value);
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  return parts[1] || null;
}

/**
 * Verifica se o e-mail pertence EXATAMENTE ao domínio institucional permitido.
 * A comparação é por igualdade total do domínio (não `endsWith`), o que barra
 * `@seplag.mt.gov.br.fake.com`.
 */
export function isAllowedInstitutionalEmail(value: string, allowedDomain: string): boolean {
  if (!isValidEmailFormat(value)) return false;
  const domain = getEmailDomain(value);
  return domain !== null && domain === allowedDomain.trim().toLowerCase();
}
