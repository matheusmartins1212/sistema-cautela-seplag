import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/modules/auth/session";
import { isAdmin } from "@/server/modules/auth/rbac";

/**
 * Rota raiz: encaminha para o painel certo do perfil (autenticado) ou para o login.
 * A decisão é feita no servidor a partir da sessão validada.
 */
export default async function HomePage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  redirect(isAdmin(session.user.role) ? "/admin" : "/painel");
}
