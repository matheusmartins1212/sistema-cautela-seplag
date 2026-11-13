import Link from "next/link";
import type { CautionStatus } from "@prisma/client";

interface Props {
  cautionId: string;
  status: CautionStatus;
}

/**
 * Mostra os atalhos para o checklist apropriado conforme o status da cautela.
 * Não-clicáveis quando o status atual não permite a ação.
 */
export function ChecklistActions({ cautionId, status }: Props) {
  const showRetirada =
    status === "AGUARDANDO_RETIRADA" ||
    status === "RETIRADA_EM_ANDAMENTO" ||
    status === "EM_USO" ||
    status === "AGUARDANDO_DEVOLUCAO" ||
    status === "DEVOLUCAO_EM_ANALISE" ||
    status === "FINALIZADA" ||
    status === "FINALIZADA_COM_OBSERVACAO" ||
    status === "ATRASADA";

  const showDevolucao =
    status === "EM_USO" ||
    status === "AGUARDANDO_DEVOLUCAO" ||
    status === "ATRASADA" ||
    status === "DEVOLUCAO_EM_ANALISE" ||
    status === "FINALIZADA" ||
    status === "FINALIZADA_COM_OBSERVACAO";

  const retiradaActive = status === "AGUARDANDO_RETIRADA" || status === "RETIRADA_EM_ANDAMENTO";
  const devolucaoActive =
    status === "EM_USO" || status === "AGUARDANDO_DEVOLUCAO" || status === "ATRASADA";

  if (!showRetirada && !showDevolucao) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {showRetirada && (
        <Link
          href={`/cautelas/${cautionId}/checklist/RETIRADA`}
          className={
            retiradaActive
              ? "inline-flex h-10 items-center rounded-md bg-institutional-800 px-4 text-sm font-semibold text-white hover:bg-institutional-700"
              : "inline-flex h-10 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
          }
        >
          {retiradaActive ? "Preencher checklist de retirada" : "Ver checklist de retirada"}
        </Link>
      )}
      {showDevolucao && (
        <Link
          href={`/cautelas/${cautionId}/checklist/DEVOLUCAO`}
          className={
            devolucaoActive
              ? "inline-flex h-10 items-center rounded-md bg-institutional-800 px-4 text-sm font-semibold text-white hover:bg-institutional-700"
              : "inline-flex h-10 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
          }
        >
          {devolucaoActive ? "Preencher checklist de devolução" : "Ver checklist de devolução"}
        </Link>
      )}
    </div>
  );
}
