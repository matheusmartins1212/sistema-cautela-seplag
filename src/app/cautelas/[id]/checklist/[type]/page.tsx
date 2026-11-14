import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChecklistType } from "@prisma/client";
import { getCurrentSession } from "@/server/modules/auth/session";
import { Errors } from "@/server/lib/errors";
import { checklistTypeParamSchema } from "@/server/modules/checklists/checklist.schemas";
import {
  getChecklistReviews,
  getOrInitChecklistForCaution,
} from "@/server/modules/checklists/checklist.service";
import { toPublicChecklist } from "@/server/modules/checklists/checklist.dto";
import { ChecklistWizard } from "@/components/checklists/checklist-wizard";
import { ChecklistStatusBadge } from "@/components/checklists/checklist-status-badge";
import { CHECKLIST_STATUS_LABEL, CHECKLIST_TYPE_LABEL } from "@/components/checklists/labels";

interface Props {
  params: Promise<{ id: string; type: string }>;
}

export default async function CautelaChecklistPage({ params }: Props) {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=/cautelas");
  const { id, type: typeRaw } = await params;

  const typeResult = checklistTypeParamSchema.safeParse(typeRaw);
  if (!typeResult.success) notFound();
  const type = typeResult.data;

  let checklistRaw;
  try {
    checklistRaw = await getOrInitChecklistForCaution(id, type, session);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === Errors.notFound().code
    ) {
      notFound();
    }
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === Errors.conflict().code
    ) {
      return (
        <div className="space-y-6">
          <BackHeader cautionId={id} />
          <div className="rounded-card border border-warning/30 bg-warning/5 p-4 text-sm text-gray-800">
            {(error as { message: string }).message}
          </div>
        </div>
      );
    }
    throw error;
  }
  const checklist = toPublicChecklist(checklistRaw);

  const editable =
    checklist.status === "PENDENTE" ||
    checklist.status === "EM_PREENCHIMENTO" ||
    checklist.status === "RETIFICADO";
  const correction =
    checklist.status === "RETIFICADO"
      ? (await getChecklistReviews(checklist.id)).find(
          (r) => r.decision === "REQUEST_RECTIFICATION",
        )
      : undefined;

  return (
    <div className="space-y-6">
      <BackHeader cautionId={id} />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-institutional-900">
          Checklist de {CHECKLIST_TYPE_LABEL[type as ChecklistType]}
        </h1>
        <ChecklistStatusBadge status={checklist.status} />
      </div>

      {!editable && (
        <div className="rounded-card border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-card">
          Este checklist já foi enviado e está como{" "}
          <strong>{CHECKLIST_STATUS_LABEL[checklist.status]}</strong>. Agora ele está com a
          administração. Se for pedida alguma correção, você recebe um aviso e poderá editá-lo de
          novo por aqui.
        </div>
      )}

      {correction && (
        <div className="rounded-card border border-warning/40 bg-warning/5 p-4 text-sm text-gray-800">
          <p className="font-semibold text-gray-900">A administração pediu uma correção</p>
          {correction.notes && <p className="mt-1 whitespace-pre-line">{correction.notes}</p>}
          <p className="mt-2 text-gray-600">
            Ajuste o que for preciso e envie o checklist de novo.
          </p>
        </div>
      )}

      {editable && (
        <ChecklistWizard cautionId={id} type={type as ChecklistType} checklist={checklist} />
      )}
    </div>
  );
}

function BackHeader({ cautionId }: { cautionId: string }) {
  return (
    <div>
      <Link
        href={`/cautelas/${cautionId}`}
        className="text-sm text-institutional-700 hover:underline"
      >
        ← Voltar para a cautela
      </Link>
    </div>
  );
}
