import Link from "next/link";
import { DamageSeverity, DamageStatus } from "@prisma/client";
import { listDamages } from "@/server/modules/damages/damage.service";
import { listDamagesQuerySchema } from "@/server/modules/damages/damage.schemas";
import { toPublicDamage } from "@/server/modules/damages/damage.dto";
import { DamageStatusBadge } from "@/components/damages/damage-status-badge";
import { DAMAGE_STATUS_LABEL, SEVERITY_LABEL } from "@/components/damages/labels";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminAvariasPage({ searchParams }: Props) {
  const raw = await searchParams;
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.length > 0) cleaned[k] = v;
  }
  const query = listDamagesQuerySchema.parse(cleaned);
  const { items, total, page, pageSize } = await listDamages(query);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-institutional-900">Avarias</h1>
        <p className="mt-1 text-sm text-gray-600">{total} registro(s).</p>
      </div>

      <form className="grid grid-cols-1 gap-3 rounded-card border border-gray-200 bg-white p-4 shadow-card sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-600">Status</span>
          <select
            name="status"
            defaultValue={cleaned.status ?? ""}
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
          >
            <option value="">Todos</option>
            {Object.values(DamageStatus).map((s) => (
              <option key={s} value={s}>
                {DAMAGE_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-600">Severidade</span>
          <select
            name="severity"
            defaultValue={cleaned.severity ?? ""}
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
          >
            <option value="">Todas</option>
            {Object.values(DamageSeverity).map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end justify-end gap-2">
          <Link
            href="/admin/avarias"
            className="inline-flex h-10 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Limpar
          </Link>
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-md bg-institutional-800 px-4 text-sm font-semibold text-white hover:bg-institutional-700"
          >
            Filtrar
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-card border border-gray-200 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-4 py-3">Veículo</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Severidade</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Aberta em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-500">
                  Nenhuma avaria registrada.
                </td>
              </tr>
            )}
            {items.map((d) => {
              const dmg = toPublicDamage(d, { includeVehicle: true });
              return (
                <tr key={dmg.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {dmg.vehicle ? (
                      <>
                        <div className="font-medium text-gray-900">
                          {dmg.vehicle.brand} {dmg.vehicle.model}
                        </div>
                        <div className="font-mono text-xs text-gray-500">
                          {dmg.vehicle.plateFormatted}
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="max-w-md px-4 py-3 text-gray-700">{dmg.description}</td>
                  <td className="px-4 py-3 text-gray-700">{SEVERITY_LABEL[dmg.severity]}</td>
                  <td className="px-4 py-3">
                    <DamageStatusBadge status={dmg.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(dmg.createdAt).toLocaleString("pt-BR")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <p className="text-sm text-gray-600">
          Página {page} de {totalPages}
        </p>
      )}
    </div>
  );
}
