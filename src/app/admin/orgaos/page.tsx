import { listAllAgencies } from "@/server/modules/agencies/agency.service";
import { AgencyManager } from "@/components/agencies/agency-manager";
import { PageHeader } from "@/components/ui/page-header";
import { countLabel } from "@/shared/format";

export const dynamic = "force-dynamic";

export default async function AdminOrgaosPage() {
  const agencies = await listAllAgencies();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Órgãos"
        description={`${countLabel(agencies.length, "órgão", "órgãos")}. Usados no cadastro dos servidores e nas solicitações.`}
      />
      <AgencyManager
        agencies={agencies.map((a) => ({ id: a.id, name: a.name, active: a.active }))}
      />
    </div>
  );
}
