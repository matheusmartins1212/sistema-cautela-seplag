/**
 * Utilidades de CPF — funções puras, usáveis no cliente e no servidor.
 * A validação crítica deve SEMPRE ocorrer também no backend.
 */

/** Remove tudo que não for dígito. */
export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, "");
}

/** Mascara o CPF para exibição: 000.***.**0-00 → ***.456.789-** estilo. */
export function maskCpf(value: string): string {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11) return "***";
  return `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
}

/** Formata para exibição completa (uso administrativo): 000.000.000-00. */
export function formatCpf(value: string): string {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11) return value;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

/** Validação dos dígitos verificadores do CPF. */
export function isValidCpf(value: string): boolean {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11) return false;
  // Rejeita sequências repetidas (000..., 111..., etc.)
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);

  const checkDigit = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += digits[i]! * (length + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return checkDigit(9) === digits[9] && checkDigit(10) === digits[10];
}
