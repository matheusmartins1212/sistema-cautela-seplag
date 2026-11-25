/** Textos curtos repetidos nas telas de pedido e de viagem. */

/** Com `forRequester`, o texto fala com quem pediu ("Você dirige"). */
export function modalityLabel(withDriver: boolean, forRequester = false): string {
  if (withDriver) return "Com condutor da central";
  return forRequester ? "Você dirige" : "O solicitante dirige";
}

/** Nomes dos passageiros, um por linha; sem nomes, só a quantidade. */
export function passengersText(names: string | null, count: number | null): string | null {
  const list = (names ?? "")
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);
  if (list.length > 0) return list.join("\n");
  if (count === null || count === undefined) return null;
  return count === 1 ? "1 passageiro" : `${count} passageiros`;
}
