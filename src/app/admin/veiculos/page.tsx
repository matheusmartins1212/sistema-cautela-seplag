import Link from "next/link";
import { VehicleCategory, VehicleStatus, VehicleUsageType } from "@prisma/client";
import { listVehicles } from "@/server/modules/vehicles/vehicle.service";
import { listVehiclesQuerySchema } from "@/server/modules/vehicles/vehicle.schemas";
import { toPublicVehicle } from "@/server/modules/vehicles/vehicle.dto";
import { VehicleStatusBadge } from "@/components/vehicles/vehicle-status-badge";
import {
  VEHICLE_CATEGORY_LABEL,
  VEHICLE_STATUS_LABEL,
  VEHICLE_USAGE_LABEL,
} from "@/components/vehicles/labels";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VeiculosPage({ searchParams }: Props) {
  const raw = await searchParams;
  // Mantém apenas valores não vazios antes de validar (Zod rejeita string vazia
  // em enums, mas o formulário submete "" quando "Todos" está selecionado).
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.length > 0) cleaned[k] = v;
  }

  const query = listVehiclesQuerySchema.parse(cleaned);
  const { items, total, page, pageSize } = await listVehicles(query);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const baseParams = new URLSearchParams();
  for (const [k, v] of Object.entries(cleaned)) {
    if (k !== "page") baseParams.set(k, v);
  }
  const pageHref = (n: number) => {
    const p = new URLSearchParams(baseParams);
    p.set("page", String(n));
    return `/admin/veiculos?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-institutional-900">Veículos</h1>
          <p className="mt-1 text-sm text-gray-600">{total} veículo(s) cadastrado(s).</p>
        </div>
        <Link
          href="/admin/veiculos/novo"
          className="inline-flex h-11 items-center rounded-md bg-institutional-800 px-4 text-sm font-semibold text-white hover:bg-institutional-700"
        >
          Novo veículo
        </Link>
      </div>

      <form className="grid grid-cols-1 gap-3 rounded-card border border-gray-200 bg-white p-4 shadow-card sm:grid-cols-5">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-600">Busca</span>
          <input
            type="text"
            name="search"
            defaultValue={cleaned.search ?? ""}
            placeholder="placa, modelo, marca"
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-600">Categoria</span>
          <select
            name="category"
            defaultValue={cleaned.category ?? ""}
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
          >
            <option value="">Todas</option>
            {Object.entries(VEHICLE_CATEGORY_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-600">Tipo de uso</span>
          <select
            name="usageType"
            defaultValue={cleaned.usageType ?? ""}
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
          >
            <option value="">Todos</option>
            {Object.entries(VEHICLE_USAGE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-600">Status</span>
          <select
            name="status"
            defaultValue={cleaned.status ?? ""}
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
          >
            <option value="">Todos</option>
            {Object.entries(VEHICLE_STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-600">Ativo</span>
          <select
            name="active"
            defaultValue={cleaned.active ?? ""}
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
          >
            <option value="">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </label>
        <div className="flex justify-end gap-2 sm:col-span-5">
          <Link
            href="/admin/veiculos"
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

      <div className="overflow-x-auto rounded-card border border-gray-200 bg-white shadow-card">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-4 py-3">Placa</th>
              <th className="px-4 py-3">Marca / Modelo</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Uso</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                  Nenhum veículo encontrado com os filtros atuais.
                </td>
              </tr>
            )}
            {items.map((vehicle) => {
              const v = toPublicVehicle(vehicle, { includeNotes: false });
              return (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-semibold text-institutional-900">
                    {v.plateFormatted}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{v.model}</div>
                    <div className="text-xs text-gray-500">{v.brand}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {VEHICLE_CATEGORY_LABEL[v.category as VehicleCategory]}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {VEHICLE_USAGE_LABEL[v.usageType as VehicleUsageType]}
                  </td>
                  <td className="px-4 py-3">
                    <VehicleStatusBadge status={v.currentStatus as VehicleStatus} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/veiculos/${v.id}`}
                      className="text-sm font-medium text-institutional-700 hover:underline"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Página {page} de {totalPages} · {total} resultados
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageHref(page - 1)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50"
              >
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageHref(page + 1)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50"
              >
                Próxima
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
