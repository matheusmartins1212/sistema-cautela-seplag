import Link from "next/link";
import { CautionStatus } from "@prisma/client";
import {
  isCautionCancellable,
  isVehicleOut,
  listAllCautions,
} from "@/server/modules/cautions/caution.service";
import { listAdminCautionsQuerySchema } from "@/server/modules/cautions/caution.schemas";
import { toPublicCaution } from "@/server/modules/cautions/caution.dto";
import { CautionStatusBadge } from "@/components/cautions/caution-status-badge";
import { CAUTION_STATUS_LABEL } from "@/components/cautions/labels";
import { CancelCautionButton } from "@/components/cautions/cancel-caution-button";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function formatDateTimeBr(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export default async function AdminCautelasPage({ searchParams }: Props) {
  const raw = await searchParams;
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.length > 0) cleaned[k] = v;
  }
  const query = listAdminCautionsQuerySchema.parse(cleaned);
  const { items, total, page, pageSize } = await listAllCautions(query);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const baseParams = new URLSearchParams();
  for (const [k, v] of Object.entries(cleaned)) {
    if (k !== "page") baseParams.set(k, v);
  }
  const pageHref = (n: number) => {
    const p = new URLSearchParams(baseParams);
    p.set("page", String(n));
    return `/admin/cautelas?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-institutional-900">Cautelas</h1>
        <p className="mt-1 text-sm text-gray-600">{total} cautela(s).</p>
      </div>

      <form className="grid grid-cols-1 gap-3 rounded-card border border-gray-200 bg-white p-4 shadow-card sm:grid-cols-4">
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-gray-600">Busca</span>
          <input
            type="text"
            name="search"
            defaultValue={cleaned.search ?? ""}
            placeholder="código, solicitante, placa, modelo…"
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-600">Status</span>
          <select
            name="status"
            defaultValue={cleaned.status ?? ""}
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
          >
            <option value="">Todos</option>
            {Object.values(CautionStatus).map((s) => (
              <option key={s} value={s}>
                {CAUTION_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end justify-end gap-2">
          <Link
            href="/admin/cautelas"
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
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Solicitante</th>
              <th className="px-4 py-3">Veículo</th>
              <th className="px-4 py-3">Período</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                  Nenhuma cautela encontrada com os filtros atuais.
                </td>
              </tr>
            )}
            {items.map((c) => {
              const cau = toPublicCaution(c, {
                includeRequest: true,
                includeUser: true,
                includeVehicle: true,
              });
              return (
                <tr key={cau.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-institutional-900">
                    {cau.publicCode}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{cau.user?.fullName ?? "—"}</div>
                    <div className="text-xs text-gray-500">
                      Mat. {cau.user?.registrationNumber ?? "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {cau.vehicle ? (
                      <>
                        <div className="font-medium text-gray-900">{cau.vehicle.model}</div>
                        <div className="font-mono text-xs text-gray-500">
                          {cau.vehicle.plateFormatted}
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatDateTimeBr(cau.plannedWithdrawalAt)}
                    <br />
                    <span className="text-xs text-gray-500">
                      até {formatDateTimeBr(cau.plannedReturnAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <CautionStatusBadge status={cau.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/admin/cautelas/${cau.id}`}
                        className="text-sm font-medium text-institutional-700 hover:underline"
                      >
                        Abrir
                      </Link>
                      {isCautionCancellable(cau.status) && (
                        <CancelCautionButton
                          cautionId={cau.id}
                          publicCode={cau.publicCode}
                          vehicleOut={isVehicleOut(cau.status)}
                          appearance="link"
                        />
                      )}
                    </div>
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
