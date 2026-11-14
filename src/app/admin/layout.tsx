import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/modules/auth/session";
import { isAdmin } from "@/server/modules/auth/rbac";
import { AppShell } from "@/components/shell/app-shell";
import { ADMIN_NAV } from "@/components/shell/nav";
import { USER_ROLE_LABEL } from "@/components/users/labels";

/**
 * Layout das rotas administrativas. Server Component que aplica a autorização
 * REAL (revalidação de sessão + papel). O middleware é apenas a primeira
 * barreira (presença de cookie).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=/admin");
  if (!isAdmin(session.user.role)) redirect("/painel");

  return (
    <AppShell
      brandTitle="Central de Veículos"
      user={{
        fullName: session.user.fullName,
        roleLabel: USER_ROLE_LABEL[session.user.role],
      }}
      nav={ADMIN_NAV}
    >
      {children}
    </AppShell>
  );
}
