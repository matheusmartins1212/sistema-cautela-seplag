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
import { DetailCard, DetailHeader, DetailLayout, Fact, Facts } from "@/components/ui/detail";

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

  const meta = [
    USER_ROLE_LABEL[user.role],
    user.isDriver ? "Condutor da central" : null,
    user.agency,
    user.department,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <DetailHeader
        backHref="/admin/usuarios"
        backLabel="Usuários"
        title={user.fullName}
        badges={<UserStatusBadge status={user.status} />}
        meta={meta}
      />

      <DetailLayout
        main={
          <>
            <DetailCard title="Dados">
              <Facts>
                <Fact label="E-mail">{user.email}</Fact>
                <Fact label="Telefone">{formatPhoneBr(user.phone)}</Fact>
                <Fact label="CPF">{user.cpfMasked}</Fact>
                <Fact label="Matrícula">{user.registrationNumber}</Fact>
                <Fact label="Órgão">{user.agency ?? "—"}</Fact>
                <Fact label="Lotação">{user.department}</Fact>
                <Fact label="Setor">{user.sector}</Fact>
              </Facts>
            </DetailCard>
          </>
        }
        aside={
          <>
            <DetailCard title="Gerenciar">
              <UserActions
                userId={user.id}
                fullName={user.fullName}
                passwordResetRequestedAt={user.passwordResetRequestedAt}
                mustChangePassword={user.mustChangePassword}
                currentStatus={user.status}
                currentRole={user.role}
                canChangeRole={canChangeRole}
                isSelf={isSelf}
              />
            </DetailCard>

            <DetailCard title="Condutor">
              {user.role === "USER" ? (
                <DriverProfileForm
                  userId={user.id}
                  isDriver={user.isDriver}
                  driverLicenseCategory={user.driverLicenseCategory}
                  driverLicenseExpiresAt={user.driverLicenseExpiresAt}
                />
              ) : (
                <p className="text-sm text-gray-600">
                  Administradores não são escalados como condutores, porque os checklists ficam na
                  área do servidor. Se esta pessoa também dirige, crie para ela uma conta de usuário
                  e habilite como condutor por lá.
                </p>
              )}
            </DetailCard>
          </>
        }
      />

      <AccountHistory
        userId={user.id}
        basePath={`/admin/usuarios/${user.id}`}
        group={historyGroup}
        page={historyPage}
      />
    </div>
  );
}
