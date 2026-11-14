import Link from "next/link";
import { redirect } from "next/navigation";
import { RequestStatus } from "@prisma/client";
import { getCurrentSession } from "@/server/modules/auth/session";
import { listMyRequests } from "@/server/modules/requests/request.service";
import { listMyRequestsQuerySchema } from "@/server/modules/requests/request.schemas";
import { toPublicRequest } from "@/server/modules/requests/request.dto";
import { RequestStatusBadge } from "@/components/requests/request-status-badge";
import { REQUEST_STATUS_LABEL } from "@/components/requests/labels";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function formatDateBr(iso: string): string {
  // iso esperado em yyyy-mm-dd
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default async function MinhasSolicitacoesPage({ searchParams }: Props) {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=/solicitacoes");

  const raw = await searchParams;
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.length > 0) cleaned[k] = v;
  }

  const query = listMyRequestsQuerySchema.parse(cleaned);
  const { items, total, page, pageSize } = await listMyRequests(query, session);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const baseParams = new URLSearchParams();
  for (const [k, v] of Object.entries(cleaned)) {
    if (k !== "page") baseParams.set(k, v);
  }
  const pageHref = (n: number) => {
    const p = new URLSearchParams(baseParams);
    p.set("page", String(n));
    return `/solicitacoes?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-institutional-900">Minhas solicitações</h1>
          <p className="mt-1 text-sm text-gray-600">{total} solicitação(ões) registrada(s).</p>
        </div>
        <Link
          href="/solicitacoes/nova"
          className="inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-md bg-institutional-800 px-4 text-sm font-semibold text-white hover:bg-institutional-700"
        >
          Nova solicitação
        </Link>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-card border border-gray-200 bg-white p-4 shadow-card">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-600">Status</span>
          <select
            name="status"
            defaultValue={cleaned.status ?? ""}
            className="h-10 w-56 rounded-md border border-gray-300 px-3 text-sm"
          >
            <option value="">Todos</option>
            {Object.values(RequestStatus).map((s) => (
              <option key={s} value={s}>
                {REQUEST_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <Link
          href="/solicitacoes"
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
      </form>

      {/* Celular: cartões tocáveis. Telas maiores: tabela. */}
      <ul className="space-y-3 sm:hidden">
        {items.length === 0 && (
          <li className="rounded-card border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-card">
            Você ainda não tem solicitações.{" "}
            <Link
              href="/solicitacoes/nova"
              className="font-medium text-institutional-700 hover:underline"
            >
              Criar a primeira
            </Link>
            .
          </li>
        )}
        {items.map((req) => {
          const r = toPublicRequest(req, { includeCaution: true });
          return (
            <li key={r.id}>
              <Link
                href={`/solicitacoes/${r.id}`}
                className="block rounded-card border border-gray-200 bg-white p-4 shadow-card active:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="break-all font-mono text-xs font-semibold text-institutional-900">
                    {r.publicCode}
                  </span>
                  <span className="shrink-0">
                    <RequestStatusBadge status={r.status} />
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-gray-900">{r.destination}</p>
                <p className="mt-1 text-xs text-gray-600">
                  {formatDateBr(r.withdrawalDate)} {r.withdrawalTime} até{" "}
                  {formatDateBr(r.returnDate)} {r.returnTime}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded-card border border-gray-200 bg-white shadow-card sm:block">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Período</th>
              <th className="px-4 py-3">Destino</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-500">
                  Você ainda não tem solicitações.{" "}
                  <Link
                    href="/solicitacoes/nova"
                    className="font-medium text-institutional-700 hover:underline"
                  >
                    Criar a primeira
                  </Link>
                  .
                </td>
              </tr>
            )}
            {items.map((req) => {
              const r = toPublicRequest(req, { includeCaution: true });
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-institutional-900">
                    {r.publicCode}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatDateBr(r.withdrawalDate)} {r.withdrawalTime}
                    <br />
                    <span className="text-xs text-gray-500">
                      até {formatDateBr(r.returnDate)} {r.returnTime}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.destination}</td>
                  <td className="px-4 py-3">
                    <RequestStatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/solicitacoes/${r.id}`}
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
