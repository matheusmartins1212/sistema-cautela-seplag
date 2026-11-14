import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { RequestForm } from "@/components/requests/request-form";

export default async function NovaSolicitacaoPage() {
  const reasons = await prisma.cautionReason.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/solicitacoes" className="text-sm text-institutional-700 hover:underline">
          ← Minhas solicitações
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-institutional-900">
          Nova solicitação de cautela
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Seus dados funcionais (nome, CPF, matrícula, setor) são puxados automaticamente da sua
          conta. Após o envio, a SATGF/SEPLAG analisará a solicitação e, se aprovada, definirá o
          veículo a ser liberado.
        </p>
      </div>

      <div className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <RequestForm reasons={reasons} />
      </div>
    </div>
  );
}
