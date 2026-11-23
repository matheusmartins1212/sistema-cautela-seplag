import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { getCurrentSession } from "@/server/modules/auth/session";
import { listActiveAgencies } from "@/server/modules/agencies/agency.service";
import { RequestForm } from "@/components/requests/request-form";

export default async function NovaSolicitacaoPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=/solicitacoes/nova");

  const [reasons, agencies] = await Promise.all([
    prisma.cautionReason.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    session.user.agency ? Promise.resolve([]) : listActiveAgencies(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/solicitacoes" className="text-sm text-institutional-700 hover:underline">
          ← Minhas solicitações
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-institutional-900">
          Nova solicitação de transporte
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Informe quando, de onde, para onde e quantas pessoas vão. A central analisa o pedido,
          define o veículo e aciona o condutor. Seus dados funcionais vêm do seu cadastro.
        </p>
      </div>

      <div className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <RequestForm
          reasons={reasons}
          userAgency={session.user.agency}
          agencies={agencies}
          defaultPhone={session.user.phone}
        />
      </div>
    </div>
  );
}
