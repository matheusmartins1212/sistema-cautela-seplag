import type { User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { listActiveAgencies } from "@/server/modules/agencies/agency.service";
import { env } from "@/server/config/env";
import { hashPassword, verifyPassword } from "@/server/lib/password";
import { generateRawToken, hashToken } from "@/server/lib/tokens";
import { expiresAt } from "@/server/lib/duration";
import { Errors } from "@/server/lib/errors";
import { recordAudit } from "@/server/lib/audit";
import type { RequestContext } from "@/server/lib/request-context";
import {
  createSession,
  destroyCurrentSession,
  getCurrentSession,
  revokeAllSessions,
} from "@/server/modules/auth/session";
import { sendTransactionalEmail } from "@/server/modules/email/email.service";
import {
  buildEmailConfirmation,
  buildPasswordReset,
} from "@/server/modules/email/templates/auth-templates";
import type { RegisterInput, LoginInput } from "@/server/modules/auth/auth.schemas";

/** Rótulo amigável de duração (ex.: "24h" → "24 horas"). */
function durationLabel(value: string): string {
  const m = /^(\d+)\s*(s|m|h|d)$/i.exec(value.trim());
  if (!m) return value;
  const n = Number(m[1]);
  const unit = m[2]!.toLowerCase();
  const names: Record<string, [string, string]> = {
    s: ["segundo", "segundos"],
    m: ["minuto", "minutos"],
    h: ["hora", "horas"],
    d: ["dia", "dias"],
  };
  const [s, p] = names[unit]!;
  return `${n} ${n === 1 ? s : p}`;
}

// Hash "dummy" para equalizar o tempo de resposta no login quando o usuário
// não existe (mitigação de timing/enumeração). Calculado uma única vez.
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword(generateRawToken());
  }
  return dummyHashPromise;
}

// ----------------------------------------------------------------------------
// Cadastro
// ----------------------------------------------------------------------------

/**
 * Órgão do cadastro: obrigatório quando a central já tem órgãos cadastrados,
 * e precisa ser um deles. Com o catálogo vazio, o campo é ignorado.
 */
async function resolveRegistrationAgency(
  informed: string | null | undefined,
): Promise<string | null> {
  const catalog = await listActiveAgencies();
  if (catalog.length === 0) return null;
  if (!informed || !catalog.some((a) => a.name === informed)) {
    throw Errors.validation("Selecione o seu órgão.", { agency: ["Selecione o seu órgão."] });
  }
  return informed;
}

export async function registerUser(
  input: RegisterInput,
  context?: RequestContext,
): Promise<{ userId: string }> {
  const agency = await resolveRegistrationAgency(input.agency);
  const passwordHash = await hashPassword(input.password);
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken, "email");

  let user: User;
  try {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          fullName: input.fullName,
          cpf: input.cpf,
          registrationNumber: input.registrationNumber,
          email: input.email,
          phone: input.phone,
          sector: input.sector,
          department: input.department,
          agency,
          passwordHash,
          role: "USER",
          status: "PENDING_EMAIL_VERIFICATION",
        },
      });
      await tx.emailVerificationToken.create({
        data: {
          userId: created.id,
          tokenHash,
          expiresAt: expiresAt(env.EMAIL_CONFIRMATION_TOKEN_EXPIRES_IN),
        },
      });
      return created;
    });
  } catch (error) {
    // Violação de unicidade (e-mail, CPF ou matrícula) — mensagem genérica para
    // não revelar qual campo já existe (mitiga enumeração).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw Errors.conflict(
        "Já existe um cadastro com os dados informados (e-mail, CPF ou matrícula).",
      );
    }
    throw error;
  }

  await recordAudit({
    action: "REGISTER",
    actorUserId: user.id,
    actorRole: user.role,
    entityType: "User",
    entityId: user.id,
    context,
  });

  // Link de confirmação (contém o token cru — entregue apenas via e-mail).
  const confirmationUrl = `${env.APP_BASE_URL}/verificar-email?token=${rawToken}`;
  await sendTransactionalEmail(
    buildEmailConfirmation({
      to: user.email,
      fullName: user.fullName,
      confirmationUrl,
      expiresInLabel: durationLabel(env.EMAIL_CONFIRMATION_TOKEN_EXPIRES_IN),
    }),
  );

  return { userId: user.id };
}

// ----------------------------------------------------------------------------
// Confirmação de e-mail
// ----------------------------------------------------------------------------

export async function verifyEmail(
  rawToken: string,
  context?: RequestContext,
): Promise<{ email: string }> {
  const tokenHash = hashToken(rawToken, "email");
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    // Carrega apenas os campos necessários do usuário (nunca o passwordHash).
    select: {
      id: true,
      userId: true,
      consumedAt: true,
      expiresAt: true,
      user: { select: { status: true, role: true, email: true } },
    },
  });

  if (!record || record.consumedAt !== null || record.expiresAt.getTime() <= Date.now()) {
    throw Errors.invalidOrExpiredToken();
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        emailVerifiedAt: new Date(),
        status: record.user.status === "PENDING_EMAIL_VERIFICATION" ? "ACTIVE" : record.user.status,
      },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
    // Invalida quaisquer outros tokens de confirmação pendentes do usuário.
    prisma.emailVerificationToken.updateMany({
      where: { userId: record.userId, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
  ]);

  await recordAudit({
    action: "EMAIL_CONFIRMED",
    actorUserId: record.userId,
    actorRole: record.user.role,
    entityType: "User",
    entityId: record.userId,
    context,
  });

  return { email: record.user.email };
}

/**
 * Reenvio controlado de confirmação. Resposta SEMPRE genérica (anti-enumeração):
 * não revela se o e-mail existe ou se já está confirmado.
 */
export async function resendConfirmation(email: string, context?: RequestContext): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== "PENDING_EMAIL_VERIFICATION") {
    return; // silencioso
  }

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken, "email");

  await prisma.$transaction([
    prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: expiresAt(env.EMAIL_CONFIRMATION_TOKEN_EXPIRES_IN),
      },
    }),
  ]);

  const confirmationUrl = `${env.APP_BASE_URL}/verificar-email?token=${rawToken}`;
  await sendTransactionalEmail(
    buildEmailConfirmation({
      to: user.email,
      fullName: user.fullName,
      confirmationUrl,
      expiresInLabel: durationLabel(env.EMAIL_CONFIRMATION_TOKEN_EXPIRES_IN),
    }),
  );

  await recordAudit({
    action: "REGISTER",
    actorUserId: user.id,
    actorRole: user.role,
    entityType: "User",
    entityId: user.id,
    metadata: { event: "resend_confirmation" },
    context,
  });
}

// ----------------------------------------------------------------------------
// Login / Logout
// ----------------------------------------------------------------------------

export async function login(input: LoginInput, context?: RequestContext): Promise<{ user: User }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Verificação de senha SEMPRE executada (mesmo sem usuário) para equalizar o
  // tempo de resposta e evitar enumeração por timing.
  const passwordOk = user
    ? await verifyPassword(user.passwordHash, input.password)
    : await verifyPassword(await getDummyHash(), input.password);

  if (!user || !passwordOk) {
    await recordAudit({
      action: "LOGIN_FAILED",
      actorUserId: user?.id ?? null,
      metadata: { reason: "invalid_credentials" },
      context,
    });
    throw Errors.invalidCredentials();
  }

  // Senha correta: só agora revelamos condições específicas da conta.
  if (user.status === "PENDING_EMAIL_VERIFICATION") {
    throw Errors.emailNotVerified();
  }
  if (user.status !== "ACTIVE" || user.deletedAt !== null) {
    throw Errors.forbidden("Conta indisponível. Contate o administrador.");
  }

  await createSession(user.id, context);
  await recordAudit({
    action: "LOGIN",
    actorUserId: user.id,
    actorRole: user.role,
    context,
  });

  return { user };
}

export async function logout(context?: RequestContext): Promise<void> {
  const session = await getCurrentSession();
  await destroyCurrentSession();
  if (session) {
    await recordAudit({
      action: "LOGOUT",
      actorUserId: session.user.id,
      actorRole: session.user.role,
      context,
    });
  }
}

// ----------------------------------------------------------------------------
// Recuperação / Reset de senha
// ----------------------------------------------------------------------------

/**
 * Solicita reset de senha. Resposta SEMPRE genérica (anti-enumeração):
 * o chamador não consegue saber se o e-mail existe.
 */
export async function forgotPassword(email: string, context?: RequestContext): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE") {
    return; // silencioso
  }

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken, "email");

  await prisma.$transaction([
    // Invalida tokens de reset anteriores ainda válidos.
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: expiresAt(env.PASSWORD_RESET_TOKEN_EXPIRES_IN),
      },
    }),
  ]);

  const resetUrl = `${env.APP_BASE_URL}/redefinir-senha?token=${rawToken}`;
  await sendTransactionalEmail(
    buildPasswordReset({
      to: user.email,
      fullName: user.fullName,
      resetUrl,
      expiresInLabel: durationLabel(env.PASSWORD_RESET_TOKEN_EXPIRES_IN),
    }),
  );

  await recordAudit({
    action: "PASSWORD_RESET_REQUESTED",
    actorUserId: user.id,
    actorRole: user.role,
    context,
  });
}

export async function resetPassword(
  rawToken: string,
  newPassword: string,
  context?: RequestContext,
): Promise<void> {
  const tokenHash = hashToken(rawToken, "email");
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    // Carrega apenas os campos necessários do usuário (nunca o passwordHash).
    select: {
      id: true,
      userId: true,
      consumedAt: true,
      expiresAt: true,
      user: { select: { role: true } },
    },
  });

  if (!record || record.consumedAt !== null || record.expiresAt.getTime() <= Date.now()) {
    throw Errors.invalidOrExpiredToken();
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
  ]);

  // Invalida todas as sessões ativas após troca de senha (segurança).
  await revokeAllSessions(record.userId);

  await recordAudit({
    action: "PASSWORD_RESET_COMPLETED",
    actorUserId: record.userId,
    actorRole: record.user.role,
    entityType: "User",
    entityId: record.userId,
    context,
  });
}
