import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/modules/auth/session";

/**
 * Rota raiz: encaminha para o painel (autenticado) ou para o login.
 * A decisão é feita no servidor a partir da sessão validada.
 */
export default async function HomePage() {
  const session = await getCurrentSession();
  redirect(session ? "/painel" : "/login");
}
