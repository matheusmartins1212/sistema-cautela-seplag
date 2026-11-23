import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/server/modules/auth/session-cookie";

/**
 * Proteção de rotas em borda (defesa em profundidade). Verifica apenas a
 * PRESENÇA do cookie de sessão para redirecionar não autenticados — a validação
 * real (sessão ativa, usuário ativo, papel) ocorre no backend/Server Components,
 * que são a fonte de verdade. O middleware não acessa banco.
 */
const PROTECTED_PREFIXES = ["/painel", "/admin", "/solicitacoes", "/cautelas"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) return NextResponse.next();

  const hasSession = req.cookies.has(SESSION_COOKIE);
  if (hasSession) {
    // Repassa o caminho para os layouts do servidor saberem para onde
    // redirecionar um administrador que abriu uma tela da área do servidor.
    const headers = new Headers(req.headers);
    headers.set("x-pathname", pathname);
    return NextResponse.next({ request: { headers } });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/painel/:path*", "/admin/:path*", "/solicitacoes/:path*", "/cautelas/:path*"],
};
