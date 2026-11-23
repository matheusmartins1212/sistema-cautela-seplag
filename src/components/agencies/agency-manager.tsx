"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyRow, TBody, THead, TableCard, Td, Th, Tr } from "@/components/ui/data-table";
import { apiDelete, apiPatch, apiPost } from "@/lib/api-client";

interface AgencyRow {
  id: string;
  name: string;
  active: boolean;
}

/** Cadastro dos órgãos atendidos pela central (incluir, desativar e remover). */
export function AgencyManager({ agencies }: { agencies: AgencyRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toRemove, setToRemove] = useState<AgencyRow | null>(null);
  const [removing, setRemoving] = useState(false);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await apiPost("/api/admin/agencies", { name });
    setLoading(false);
    if (result.ok) {
      setName("");
      router.refresh();
      return;
    }
    setError(result.error.fieldErrors?.name?.[0] ?? result.error.message);
  }

  async function toggle(agency: AgencyRow) {
    setBusyId(agency.id);
    setError(null);
    const result = await apiPatch(`/api/admin/agencies/${agency.id}`, { active: !agency.active });
    setBusyId(null);
    if (result.ok) {
      router.refresh();
      return;
    }
    setError(result.error.message);
  }

  async function remove() {
    if (!toRemove) return;
    setRemoving(true);
    setError(null);
    const result = await apiDelete(`/api/admin/agencies/${toRemove.id}`);
    setRemoving(false);
    setToRemove(null);
    if (result.ok) {
      router.refresh();
      return;
    }
    setError(result.error.message);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={add}
        className="flex flex-col gap-3 rounded-card border border-gray-200 bg-white p-4 shadow-card sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <Field
            label="Novo órgão"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: SEPLAG - Secretaria de Estado de Planejamento e Gestão"
            required
          />
        </div>
        <Button type="submit" loading={loading} disabled={name.trim().length < 2}>
          Incluir
        </Button>
      </form>

      {error && <Alert tone="error">{error}</Alert>}

      <TableCard minWidth="46rem">
        <THead>
          <Th>Órgão</Th>
          <Th width="8rem">Situação</Th>
          <Th align="right" width="12rem">
            <span className="sr-only">Ações</span>
          </Th>
        </THead>
        <TBody>
          {agencies.length === 0 && (
            <EmptyRow colSpan={3}>
              Nenhum órgão cadastrado. Enquanto a lista estiver vazia, o cadastro e as solicitações
              não pedem o órgão.
            </EmptyRow>
          )}
          {agencies.map((a) => (
            <Tr key={a.id}>
              <Td
                truncate
                className={a.active ? "font-medium text-gray-900" : "text-gray-400"}
                title={a.name}
              >
                {a.name}
              </Td>
              <Td>
                <Badge tone={a.active ? "success" : "muted"}>
                  {a.active ? "Ativo" : "Inativo"}
                </Badge>
              </Td>
              <Td align="right">
                <button
                  type="button"
                  onClick={() => toggle(a)}
                  disabled={busyId === a.id}
                  className="text-sm font-medium text-institutional-700 hover:underline disabled:opacity-50"
                >
                  {a.active ? "Desativar" : "Reativar"}
                </button>
                <button
                  type="button"
                  onClick={() => setToRemove(a)}
                  disabled={busyId === a.id}
                  aria-label={`Remover ${a.name}`}
                  className="ml-4 text-sm font-medium text-gray-500 hover:text-danger hover:underline disabled:opacity-50"
                >
                  Remover
                </button>
              </Td>
            </Tr>
          ))}
        </TBody>
      </TableCard>

      <ConfirmDialog
        open={toRemove !== null}
        title="Remover órgão?"
        tone="danger"
        confirmLabel="Remover"
        loading={removing}
        onCancel={() => setToRemove(null)}
        onConfirm={remove}
        description={
          <>
            <strong>{toRemove?.name}</strong> sai da lista. Contas e solicitações que já usam esse
            nome continuam com ele. A remoção fica registrada no histórico da sua conta.
          </>
        }
      />
    </div>
  );
}
