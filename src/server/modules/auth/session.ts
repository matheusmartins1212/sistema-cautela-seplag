import { cache } from "react";
import { cookies } from "next/headers";
import type { Prisma, User } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { env, isProduction } from "@/server/config/env";
import { generateRawToken, hashToken } from "@/server/lib/tokens";
import type { RequestContext } from "@/server/lib/request-context";
import { SESSION_COOKIE } from "@/server/modules/auth/session-cookie";

export { SESSION_COOKIE };

/**
 * Campos do usuário carregados junto da sessão. NUNCA inclui `passwordHash` —
 * o hash de senha jamais deve transitar pela camada de sessão (defesa em
 * profundidade contra serialização acidental para o cliente).
 */
const SESSION_USER_SELECT = {
  id: true,
  fullName: true,
  cpf: true,
  registrationNumber: true,
  email: true,
  phone: true,
  sector: true,
  department: true,
  agency: true,
  role: true,
  status: true,
  emailVerifiedAt: true,
  isDriver: true,
  driverLicenseCategory: true,
  driverLicenseExpiresAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;

/** Usuário da sessão, sem o `passwordHash`. */
export type SessionUserData = Omit<User, "passwordHash">;

/**
 * Sessões server-side. O cookie guarda apenas o token CRU opaco (HttpOnly);
 * o banco guarda somente o HASH do token. Em produção o cookie é Secure.
 *
 * O token de sessão NUNCA é logado.
 */

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Cria uma sessão para o usuário e grava o cookie. Retorna o id da sessão. */
export async function createSession(userId: string, context?: RequestContext): Promise<string> {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken, "session");
  const ttl = env.SESSION_TTL_SECONDS;
  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
      expiresAt: new Date(Date.now() + ttl * 1_000),
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, rawToken, cookieOptions(ttl));
  return session.id;
}

export interface SessionUser {
  session: { id: string; expiresAt: Date };
  user: SessionUserData;
}

/**
 * Lê e valida a sessão atual a partir do cookie. Revalida que a sessão não foi
 * revogada/expirou e que o usuário continua ATIVO (seção 5.1). Retorna null se
 * inválida.
 *
 * `cache` do React deduplica chamadas dentro da mesma requisição (layout +
 * page + guard) em uma única query ao banco.
 */
export const getCurrentSession = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const rawToken = store.get(SESSION_COOKIE)?.value;
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken, "session");
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      revokedAt: true,
      expiresAt: true,
      user: { select: SESSION_USER_SELECT },
    },
  });

  if (!session || session.revokedAt !== null || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  // Revalidação do usuário em toda rota protegida.
  if (session.user.status !== "ACTIVE" || session.user.deletedAt !== null) {
    return null;
  }

  return {
    session: { id: session.id, expiresAt: session.expiresAt },
    user: session.user,
  };
});

/** Revoga a sessão atual (logout real) e limpa o cookie. */
export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const rawToken = store.get(SESSION_COOKIE)?.value;
  if (rawToken) {
    const tokenHash = hashToken(rawToken, "session");
    await prisma.session
      .updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .catch(() => undefined);
  }
  store.delete(SESSION_COOKIE);
}

/** Revoga todas as sessões ativas de um usuário (ex.: após reset de senha). */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
