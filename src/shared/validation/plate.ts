/**
 * Utilidades de placa veicular brasileira — funções puras, usáveis no cliente
 * e no servidor. Aceita o formato antigo (AAA9999) e o Mercosul (AAA9A99).
 * A validação crítica deve SEMPRE ocorrer também no backend.
 */

const PLATE_OLD = /^[A-Z]{3}\d{4}$/;
const PLATE_MERCOSUL = /^[A-Z]{3}\d[A-Z]\d{2}$/;

/** Remove espaços, hífens e caracteres invisíveis; aplica uppercase. */
export function normalizePlate(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\s\-​-‍﻿]/g, "")
    .toUpperCase();
}

/** Valida que a placa está em um dos dois formatos aceitos. */
export function isValidPlate(value: string): boolean {
  const plate = normalizePlate(value);
  if (plate.length !== 7) return false;
  return PLATE_OLD.test(plate) || PLATE_MERCOSUL.test(plate);
}

/** Formata placa para exibição com hífen (AAA-9999 ou AAA-9A99). */
export function formatPlate(value: string): string {
  const plate = normalizePlate(value);
  if (!isValidPlate(plate)) return value;
  return `${plate.slice(0, 3)}-${plate.slice(3)}`;
}
