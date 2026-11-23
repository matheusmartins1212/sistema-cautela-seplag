import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/modules/auth/session";
import { listActiveAgencies } from "@/server/modules/agencies/agency.service";
import { RequestForm } from "@/components/requests/request-form";

export default async function NovaSolicitacaoPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=/solicitacoes/nova");

  const agencies = session.user.agency ? [] : await listActiveAgencies();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/solicitacoes" className="text-sm text-institutional-700 hover:underline">
          ← Minhas solicitações
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-institutional-900">Nova solicitação</h1>
        <p className="mt-1 text-sm text-gray-600">
          Peça um veículo com condutor da central ou para você mesmo dirigir. A central analisa o
          pedido e define o veículo (e o condutor, quando for o caso). Seus dados funcionais vêm do
          seu cadastro.
        </p>
      </div>

      <div className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <RequestForm
          userAgency={session.user.agency}
          agencies={agencies}
          defaultPhone={session.user.phone}
        />
      </div>
    </div>
  );
}
