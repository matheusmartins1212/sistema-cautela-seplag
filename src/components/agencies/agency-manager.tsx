"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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

      <div className="overflow-hidden rounded-card border border-gray-200 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-4 py-3">Órgão</th>
              <th className="px-4 py-3">Situação</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {agencies.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-sm text-gray-500">
                  Nenhum órgão cadastrado. Enquanto a lista estiver vazia, o cadastro e as
                  solicitações não pedem o órgão.
                </td>
              </tr>
            )}
            {agencies.map((a) => (
              <tr key={a.id} className={a.active ? "" : "bg-gray-50 text-gray-500"}>
                <td className="px-4 py-3 font-medium">{a.name}</td>
                <td className="px-4 py-3">{a.active ? "Ativo" : "Inativo"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
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
                    className="ml-4 text-sm font-medium text-danger hover:underline disabled:opacity-50"
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
