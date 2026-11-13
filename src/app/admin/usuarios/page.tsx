import Link from "next/link";
import { UserRole, UserStatus } from "@prisma/client";
import { listUsers } from "@/server/modules/users/user.service";
import { listUsersQuerySchema } from "@/server/modules/users/user.schemas";
import { toPublicUser } from "@/server/modules/users/user.dto";
import { UserStatusBadge } from "@/components/users/user-status-badge";
import { USER_ROLE_LABEL, USER_STATUS_LABEL } from "@/components/users/labels";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminUsuariosPage({ searchParams }: Props) {
  const raw = await searchParams;
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.length > 0) cleaned[k] = v;
  }

  const query = listUsersQuerySchema.parse(cleaned);
  const { items, total, page, pageSize } = await listUsers(query);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const baseParams = new URLSearchParams();
  for (const [k, v] of Object.entries(cleaned)) {
    if (k !== "page") baseParams.set(k, v);
  }
  const pageHref = (n: number) => {
    const p = new URLSearchParams(baseParams);
    p.set("page", String(n));
    return `/admin/usuarios?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-institutional-900">Usuários</h1>
        <p className="mt-1 text-sm text-gray-600">{total} usuário(s).</p>
      </div>

      <form className="grid grid-cols-1 gap-3 rounded-card border border-gray-200 bg-white p-4 shadow-card sm:grid-cols-4">
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-gray-600">Busca</span>
          <input
            type="text"
            name="search"
            defaultValue={cleaned.search ?? ""}
            placeholder="nome, e-mail, matrícula ou CPF…"
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
            {Object.values(UserStatus).map((s) => (
              <option key={s} value={s}>
                {USER_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-600">Papel</span>
          <select
            name="role"
            defaultValue={cleaned.role ?? ""}
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
          >
            <option value="">Todos</option>
            {Object.values(UserRole).map((r) => (
              <option key={r} value={r}>
                {USER_ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex justify-end gap-2 sm:col-span-4">
          <Link
            href="/admin/usuarios"
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
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Lotação</th>
              <th className="px-4 py-3">Papel</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                  Nenhum usuário encontrado com os filtros atuais.
                </td>
              </tr>
            )}
            {items.map((u) => {
              const user = toPublicUser(u);
              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{user.fullName}</div>
                    <div className="text-xs text-gray-500">Mat. {user.registrationNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{user.email}</td>
                  <td className="px-4 py-3 text-gray-700">{user.department}</td>
                  <td className="px-4 py-3 text-gray-700">{USER_ROLE_LABEL[user.role]}</td>
                  <td className="px-4 py-3">
                    <UserStatusBadge status={user.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/usuarios/${user.id}`}
                      className="text-sm font-medium text-institutional-700 hover:underline"
                    >
                      Gerenciar
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
