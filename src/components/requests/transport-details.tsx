import type { PublicVehicleRequest } from "@/server/modules/requests/request.dto";
import { formatPhoneBr } from "@/shared/phone";

function formatDateBr(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Bloco com os dados do transporte pedido (quando, trajeto, passageiros,
 * finalidade). Usado pelo solicitante e pela central. Pedidos sem condutor
 * podem não ter local de saída e passageiros: mostra só o que existe.
 */
export function TransportDetails({ r }: { r: PublicVehicleRequest }) {
  return (
    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
      <Row
        label="Modalidade"
        value={r.withDriver ? "Com condutor da central" : "Sem condutor (o solicitante dirige)"}
      />
      {r.requestingAgency && <Row label="Órgão solicitante" value={r.requestingAgency} />}
      <Row label="Saída" value={`${formatDateBr(r.withdrawalDate)} às ${r.withdrawalTime}`} />
      <Row label="Retorno previsto" value={`${formatDateBr(r.returnDate)} às ${r.returnTime}`} />
      {r.origin && <Row label="Local de saída" value={r.origin} />}
      <Row label="Destino" value={r.destination} />
      {r.passengerCount !== null && <Row label="Passageiros" value={String(r.passengerCount)} />}
      {r.contactPhone && <Row label="Contato no dia" value={formatPhoneBr(r.contactPhone)} />}
      <Row label="Finalidade" value={r.reason} />
      {r.termNumber && <Row label="Número do termo" value={r.termNumber} />}
      {r.passengerNames && (
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase text-gray-500">Nomes dos passageiros</dt>
          <dd className="mt-0.5 whitespace-pre-line font-medium text-gray-900">
            {r.passengerNames}
          </dd>
        </div>
      )}
    </dl>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-gray-900">{value}</dd>
    </div>
  );
}
