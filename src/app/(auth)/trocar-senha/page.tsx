import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/modules/auth/session";
import { isAdmin } from "@/server/modules/auth/rbac";
import { ChangeTemporaryPasswordForm } from "@/components/auth/change-temporary-password-form";

export const dynamic = "force-dynamic";

/** Troca obrigatória da senha provisória gerada pela central. */
export default async function TrocarSenhaPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (!session.user.mustChangePassword) {
    redirect(isAdmin(session.user.role) ? "/admin" : "/painel");
  }
  return (
    <ChangeTemporaryPasswordForm
      firstName={session.user.fullName.split(" ")[0] ?? ""}
      home={isAdmin(session.user.role) ? "/admin" : "/painel"}
    />
  );
}
