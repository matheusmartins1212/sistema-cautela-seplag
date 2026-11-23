import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/server/modules/auth/session";
import { isSuperAdmin } from "@/server/modules/auth/rbac";
import { getUserByIdAdmin } from "@/server/modules/users/user.service";
import { toPublicUser } from "@/server/modules/users/user.dto";
import { UserStatusBadge } from "@/components/users/user-status-badge";
import { USER_ROLE_LABEL } from "@/components/users/labels";
import { UserActions } from "@/components/users/user-actions";
import { DriverProfileForm } from "@/components/drivers/driver-profile-form";
import { formatPhoneBr } from "@/shared/phone";
import { AccountHistory } from "@/components/users/account-history";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminUsuarioDetailPage({ params, searchParams }: Props) {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=/admin/usuarios");

  const { id } = await params;
  const sp = await searchParams;
  const historyGroup = typeof sp.acoes === "string" ? sp.acoes : undefined;
  const historyPage = Math.max(
    1,
    Number.parseInt(typeof sp.pagina === "string" ? sp.pagina : "1", 10) || 1,
  );
  const record = await getUserByIdAdmin(id).catch(() => null);
  if (!record) notFound();

  const user = toPublicUser(record);
  const canChangeRole = isSuperAdmin(session.user.role);
  const isSelf = session.user.id === user.id;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/usuarios"
          className="text-sm font-medium text-institutional-700 hover:underline"
        >
          ← Voltar para usuários
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-institutional-900">{user.fullName}</h1>
          <UserStatusBadge status={user.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-card border border-gray-200 bg-white p-5 shadow-card">
          <h2 className="text-sm font-semibold text-gray-700">Dados do usuário</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row label="E-mail" value={user.email} />
            <Row label="CPF" value={user.cpfMasked} />
            <Row label="Matrícula" value={user.registrationNumber} />
            <Row label="Telefone" value={formatPhoneBr(user.phone)} />
            <Row label="Órgão" value={user.agency ?? "—"} />
            <Row label="Setor" value={user.sector} />
            <Row label="Lotação" value={user.department} />
            <Row label="Papel" value={USER_ROLE_LABEL[user.role]} />
          </dl>
        </section>

        <section className="rounded-card border border-gray-200 bg-white p-5 shadow-card">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Gerenciar</h2>
          <UserActions
            userId={user.id}
            currentStatus={user.status}
            currentRole={user.role}
            canChangeRole={canChangeRole}
            isSelf={isSelf}
          />
        </section>

        <section className="rounded-card border border-gray-200 bg-white p-5 shadow-card lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Condutor</h2>
          {user.role === "USER" ? (
            <DriverProfileForm
              userId={user.id}
              isDriver={user.isDriver}
              driverLicenseCategory={user.driverLicenseCategory}
              driverLicenseExpiresAt={user.driverLicenseExpiresAt}
            />
          ) : (
            <p className="text-sm text-gray-600">
              Administradores não são escalados como condutores, porque os checklists ficam na área
              do servidor. Se esta pessoa também dirige, crie para ela uma conta de usuário e
              habilite como condutor por lá.
            </p>
          )}
        </section>
      </div>

      <AccountHistory
        userId={user.id}
        basePath={`/admin/usuarios/${user.id}`}
        group={historyGroup}
        page={historyPage}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}
