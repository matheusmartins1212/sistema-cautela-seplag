import { listAllAgencies } from "@/server/modules/agencies/agency.service";
import { AgencyManager } from "@/components/agencies/agency-manager";

export const dynamic = "force-dynamic";

export default async function AdminOrgaosPage() {
  const agencies = await listAllAgencies();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-institutional-900">Órgãos atendidos</h1>
        <p className="mt-1 text-sm text-gray-600">
          Lista usada no cadastro dos servidores e nas solicitações, para a central saber de qual
          órgão vem cada pedido. Desativar tira o órgão das listas e permite reativar depois;
          remover apaga do catálogo. Nos dois casos, os pedidos antigos mantêm o nome.
        </p>
      </div>
      <AgencyManager
        agencies={agencies.map((a) => ({ id: a.id, name: a.name, active: a.active }))}
      />
    </div>
  );
}
