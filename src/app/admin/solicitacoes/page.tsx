import Link from "next/link";
import { RequestStatus } from "@prisma/client";
import { listAllRequests } from "@/server/modules/requests/request.service";
import { listAdminRequestsQuerySchema } from "@/server/modules/requests/request.schemas";
import { toPublicRequest } from "@/server/modules/requests/request.dto";
import { RequestStatusBadge } from "@/components/requests/request-status-badge";
import { REQUEST_STATUS_LABEL } from "@/components/requests/labels";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function formatDateBr(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default async function AdminSolicitacoesPage({ searchParams }: Props) {
  const raw = await searchParams;
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.length > 0) cleaned[k] = v;
  }

  const query = listAdminRequestsQuerySchema.parse(cleaned);
  const { items, total, page, pageSize } = await listAllRequests(query);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const baseParams = new URLSearchParams();
  for (const [k, v] of Object.entries(cleaned)) {
    if (k !== "page") baseParams.set(k, v);
  }
  const pageHref = (n: number) => {
    const p = new URLSearchParams(baseParams);
    p.set("page", String(n));
    return `/admin/solicitacoes?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-institutional-900">Solicitações</h1>
          <p className="mt-1 text-sm text-gray-600">{total} solicitação(ões).</p>
        </div>
      </div>

      <form className="grid grid-cols-1 gap-3 rounded-card border border-gray-200 bg-white p-4 shadow-card sm:grid-cols-5">
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-gray-600">Busca</span>
          <input
            type="text"
            name="search"
            defaultValue={cleaned.search ?? ""}
            placeholder="código, solicitante, órgão, destino…"
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
            {Object.values(RequestStatus).map((s) => (
              <option key={s} value={s}>
                {REQUEST_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-600">Saída de</span>
          <input
            type="date"
            name="withdrawalDateFrom"
            defaultValue={cleaned.withdrawalDateFrom ?? ""}
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-600">Saída até</span>
          <input
            type="date"
            name="withdrawalDateTo"
            defaultValue={cleaned.withdrawalDateTo ?? ""}
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
          />
        </label>
        <div className="flex justify-end gap-2 sm:col-span-5">
          <Link
            href="/admin/solicitacoes"
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
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Solicitante</th>
              <th className="px-4 py-3">Período</th>
              <th className="px-4 py-3">Trajeto</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                  Nenhuma solicitação encontrada com os filtros atuais.
                </td>
              </tr>
            )}
            {items.map((req) => {
              const r = toPublicRequest(req, { includeUser: true, includeCaution: true });
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-institutional-900">
                    {r.publicCode}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{r.user?.fullName ?? "—"}</div>
                    <div className="text-xs text-gray-500">
                      {r.requestingAgency ?? `Mat. ${r.user?.registrationNumber ?? "—"}`}
                      {r.passengerCount !== null && ` · ${r.passengerCount} passageiro(s)`}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatDateBr(r.withdrawalDate)} {r.withdrawalTime}
                    <br />
                    <span className="text-xs text-gray-500">
                      até {formatDateBr(r.returnDate)} {r.returnTime}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {r.origin && <div className="text-xs text-gray-500">de {r.origin}</div>}
                    <div>{r.destination}</div>
                    {r.caution?.driver && (
                      <div className="text-xs text-gray-500">
                        Condutor: {r.caution.driver.fullName}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <RequestStatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/solicitacoes/${r.id}`}
                      className="text-sm font-medium text-institutional-700 hover:underline"
                    >
                      Analisar
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
