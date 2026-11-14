import Link from "next/link";
import { listDriversOverview } from "@/server/modules/users/user.service";
import { UserStatusBadge } from "@/components/users/user-status-badge";
import { toAppWallClock } from "@/shared/time";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

function formatDateBr(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getUTCFullYear()}`;
}

function formatDateTimeBr(date: Date): string {
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${formatDateBr(date)} ${hh}:${mm}`;
}

/** Situação da CNH em relação a hoje (horário de Cuiabá). */
function licenseStatus(expiresAt: Date | null): { label: string; tone: string } {
  if (!expiresAt) return { label: "Validade não informada", tone: "text-gray-500" };
  const today = toAppWallClock(new Date());
  today.setUTCHours(0, 0, 0, 0);
  const days = Math.round((expiresAt.getTime() - today.getTime()) / DAY_MS);
  if (days < 0) return { label: `Vencida em ${formatDateBr(expiresAt)}`, tone: "text-danger" };
  if (days <= 30) {
    return { label: `Vence em ${formatDateBr(expiresAt)}`, tone: "text-warning" };
  }
  return { label: `Válida até ${formatDateBr(expiresAt)}`, tone: "text-gray-700" };
}

export default async function AdminCondutoresPage() {
  const drivers = await listDriversOverview();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-institutional-900">Condutores</h1>
        <p className="mt-1 text-sm text-gray-600">
          {drivers.length} condutor(es) habilitado(s). Para incluir alguém, abra a pessoa em{" "}
          <Link
            href="/admin/usuarios"
            className="font-medium text-institutional-700 hover:underline"
          >
            Usuários
          </Link>{" "}
          e marque &quot;Condutor da central&quot;. O condutor precisa ter conta na plataforma.
        </p>
      </div>

      <div className="overflow-x-auto rounded-card border border-gray-200 bg-white shadow-card">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-4 py-3">Condutor</th>
              <th className="px-4 py-3">CNH</th>
              <th className="px-4 py-3">Viagens em aberto</th>
              <th className="px-4 py-3">Próxima saída</th>
              <th className="px-4 py-3">Acesso</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {drivers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                  Nenhum condutor habilitado ainda.
                </td>
              </tr>
            )}
            {drivers.map(({ user, activeTrips, nextTripAt }) => {
              const license = licenseStatus(user.driverLicenseExpiresAt);
              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{user.fullName}</div>
                    <div className="text-xs text-gray-500">{user.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {user.driverLicenseCategory ?? "—"}
                    </div>
                    <div className={`text-xs ${license.tone}`}>{license.label}</div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-gray-700">{activeTrips}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {nextTripAt ? formatDateTimeBr(nextTripAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <UserStatusBadge status={user.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/admin/cautelas?driverId=${user.id}`}
                        className="text-sm font-medium text-institutional-700 hover:underline"
                      >
                        Viagens
                      </Link>
                      <Link
                        href={`/admin/usuarios/${user.id}`}
                        className="text-sm font-medium text-institutional-700 hover:underline"
                      >
                        Editar
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
