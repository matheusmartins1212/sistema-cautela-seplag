import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/modules/auth/session";
import { isAdmin } from "@/server/modules/auth/rbac";
import { AppShell } from "@/components/shell/app-shell";
import { USER_NAV_SECTIONS, adminEquivalentPath } from "@/components/shell/nav";
import { toShellUser } from "@/components/shell/shell-user";

/**
 * Casca da área do servidor (início, solicitações e cautelas). É exclusiva de
 * quem tem perfil de usuário: administradores usam só o painel administrativo.
 */
export async function UserAreaShell({
  loginNext,
  children,
}: {
  loginNext: string;
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session) redirect(`/login?next=${loginNext}`);
  // Senha provisória: nada da área funciona antes da troca obrigatória.
  if (session.user.mustChangePassword) redirect("/trocar-senha");
  if (isAdmin(session.user.role)) {
    const pathname = (await headers()).get("x-pathname");
    redirect(adminEquivalentPath(pathname));
  }

  return (
    <AppShell
      brandTitle="Central de Veículos"
      contentMaxWidth="5xl"
      user={toShellUser(session.user)}
      profileHref="/perfil"
      sections={USER_NAV_SECTIONS}
    >
      {children}
    </AppShell>
  );
}
