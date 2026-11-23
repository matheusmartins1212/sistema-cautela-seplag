/** Categoria da CNH dividida em veículo (B, C, D ou E) e moto (A). */
export function splitLicenseCategory(v: string | null): { main: string; moto: boolean } {
  if (!v) return { main: "", moto: false };
  const moto = v.startsWith("A");
  return { main: moto ? v.slice(1) : v, moto };
}

export function joinLicenseCategory(main: string, moto: boolean): string {
  if (!main) return "";
  return moto ? `A${main}` : main;
}
