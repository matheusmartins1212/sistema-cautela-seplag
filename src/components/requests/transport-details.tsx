import type { PublicVehicleRequest } from "@/server/modules/requests/request.dto";
import { Fact, Facts } from "@/components/ui/detail";
import { passengersText } from "@/components/requests/trip-text";
import { formatPhoneBr } from "@/shared/phone";

/**
 * Dados do pedido que não estão no cabeçalho (o período e a modalidade ficam
 * lá). Usado pelo solicitante e pela central. Mostra só o que foi preenchido.
 */
export function TransportDetails({ r }: { r: PublicVehicleRequest }) {
  const passengers = passengersText(r.passengerNames, r.passengerCount);
  return (
    <Facts>
      {r.origin && <Fact label="Local de saída">{r.origin}</Fact>}
      {r.requestingAgency && <Fact label="Órgão solicitante">{r.requestingAgency}</Fact>}
      {r.contactPhone && <Fact label="Contato no dia">{formatPhoneBr(r.contactPhone)}</Fact>}
      {r.termNumber && <Fact label="Número do termo">{r.termNumber}</Fact>}
      {passengers && <Fact label="Passageiros">{passengers}</Fact>}
      <Fact label="Finalidade" wide>
        {r.reason}
      </Fact>
    </Facts>
  );
}
