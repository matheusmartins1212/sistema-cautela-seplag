/**
 * Política de senha forte — função pura, usada no schema de cadastro/reset
 * (backend) e reaproveitável no frontend para feedback. A validação crítica
 * ocorre SEMPRE no backend (via Zod, que consome estas regras).
 *
 * Requisitos (seção 6 da especificação):
 *  - mínimo de caracteres adequado;
 *  - letras maiúsculas e minúsculas;
 *  - números;
 *  - símbolos;
 *  - bloqueio de senhas muito fracas/comuns.
 */

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

// Lista curta de senhas notoriamente fracas (comparação case-insensitive).
const COMMON_WEAK_PASSWORDS = new Set([
  "senha",
  "password",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyuiop",
  "admin",
  "administrador",
  "sesp",
  "sutran",
  "seplag",
  "mudar123",
  "trocar123",
]);

export interface PasswordCheckResult {
  valid: boolean;
  errors: string[];
}

export function checkPasswordStrength(password: string): PasswordCheckResult {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`A senha deve ter ao menos ${PASSWORD_MIN_LENGTH} caracteres.`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`);
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("A senha deve conter ao menos uma letra maiúscula.");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("A senha deve conter ao menos uma letra minúscula.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("A senha deve conter ao menos um número.");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("A senha deve conter ao menos um símbolo.");
  }
  if (COMMON_WEAK_PASSWORDS.has(password.trim().toLowerCase())) {
    errors.push("Esta senha é muito comum. Escolha uma senha mais forte.");
  }

  return { valid: errors.length === 0, errors };
}

export function isStrongPassword(password: string): boolean {
  return checkPasswordStrength(password).valid;
}
