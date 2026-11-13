import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/modules/auth/session";
import { isAdmin } from "@/server/modules/auth/rbac";
import { AppShell } from "@/components/shell/app-shell";
import { buildUserNav } from "@/components/shell/nav";
import { USER_ROLE_LABEL } from "@/components/users/labels";

export default async function CautelasLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=/cautelas");

  return (
    <AppShell
      brandTitle="Cautela de Veículos"
      contentMaxWidth="5xl"
      user={{
        fullName: session.user.fullName,
        roleLabel: USER_ROLE_LABEL[session.user.role],
      }}
      nav={buildUserNav(isAdmin(session.user.role))}
    >
      {children}
    </AppShell>
  );
}
