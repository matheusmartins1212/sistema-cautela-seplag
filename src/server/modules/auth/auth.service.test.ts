import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks de dependências externas do serviço (DB, sessão, e-mail, auditoria) ---
vi.mock("@/server/db/prisma", () => {
  const prisma = {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    emailVerificationToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    passwordResetToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(async (arg: unknown) =>
      typeof arg === "function"
        ? (arg as (tx: unknown) => unknown)(prisma)
        : Promise.all(arg as Promise<unknown>[]),
    ),
  };
  return { prisma };
});
vi.mock("@/server/modules/auth/session", () => ({
  createSession: vi.fn(),
  destroyCurrentSession: vi.fn(),
  getCurrentSession: vi.fn(),
  revokeAllSessions: vi.fn(),
}));
vi.mock("@/server/modules/email/email.service", () => ({
  sendTransactionalEmail: vi.fn().mockResolvedValue({ ok: true, emailLogId: "log" }),
}));
vi.mock("@/server/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/server/lib/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("HASH"),
  verifyPassword: vi.fn(),
}));

import { prisma } from "@/server/db/prisma";
import { createSession } from "@/server/modules/auth/session";
import { sendTransactionalEmail } from "@/server/modules/email/email.service";
import { recordAudit } from "@/server/lib/audit";
import { verifyPassword } from "@/server/lib/password";
import { login, verifyEmail, forgotPassword } from "./auth.service";

const baseUser = {
  id: "u1",
  fullName: "João da Silva",
  email: "joao@seplag.mt.gov.br",
  cpf: "52998224725",
  registrationNumber: "123",
  phone: "65999990000",
  sector: "Gestão de Frota",
  department: "Gestão de Frota",
  role: "USER" as const,
  status: "ACTIVE" as const,
  passwordHash: "HASH",
  emailVerifiedAt: new Date(),
  mustChangePassword: false,
  passwordResetRequestedAt: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("login", () => {
  it("rejeita credenciais inválidas (senha errada) e audita LOGIN_FAILED", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as never);
    vi.mocked(verifyPassword).mockResolvedValue(false);

    await expect(login({ email: baseUser.email, password: "x" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
    expect(createSession).not.toHaveBeenCalled();
    expect(vi.mocked(recordAudit).mock.calls[0]?.[0]?.action).toBe("LOGIN_FAILED");
  });

  it("rejeita e-mail inexistente com a MESMA mensagem genérica (anti-enumeração)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
    vi.mocked(verifyPassword).mockResolvedValue(false);

    await expect(
      login({ email: "naoexiste@seplag.mt.gov.br", password: "x" }),
    ).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
    // Mesmo sem usuário, a verificação de senha é executada (mitigação de timing).
    expect(verifyPassword).toHaveBeenCalled();
  });

  it("bloqueia conta não confirmada mesmo com senha correta", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...baseUser,
      status: "PENDING_EMAIL_VERIFICATION",
    } as never);
    vi.mocked(verifyPassword).mockResolvedValue(true);

    await expect(login({ email: baseUser.email, password: "ok" })).rejects.toMatchObject({
      code: "EMAIL_NOT_VERIFIED",
    });
    expect(createSession).not.toHaveBeenCalled();
  });

  it("cria sessão e audita LOGIN no sucesso", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as never);
    vi.mocked(verifyPassword).mockResolvedValue(true);

    const result = await login({ email: baseUser.email, password: "ok" });
    expect(result.user.id).toBe("u1");
    expect(createSession).toHaveBeenCalledWith("u1", undefined);
    expect(vi.mocked(recordAudit).mock.calls.at(-1)?.[0]?.action).toBe("LOGIN");
  });
});

describe("verifyEmail", () => {
  it("rejeita token inexistente", async () => {
    vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue(null as never);
    await expect(verifyEmail("tok")).rejects.toMatchObject({
      code: "INVALID_OR_EXPIRED_TOKEN",
    });
  });

  it("rejeita token expirado", async () => {
    vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue({
      id: "t1",
      userId: "u1",
      tokenHash: "h",
      consumedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
      user: baseUser,
    } as never);
    await expect(verifyEmail("tok")).rejects.toMatchObject({
      code: "INVALID_OR_EXPIRED_TOKEN",
    });
  });

  it("rejeita token já consumido (uso único)", async () => {
    vi.mocked(prisma.emailVerificationToken.findUnique).mockResolvedValue({
      id: "t1",
      userId: "u1",
      tokenHash: "h",
      consumedAt: new Date(),
      expiresAt: new Date(Date.now() + 100000),
      createdAt: new Date(),
      user: baseUser,
    } as never);
    await expect(verifyEmail("tok")).rejects.toMatchObject({
      code: "INVALID_OR_EXPIRED_TOKEN",
    });
  });
});

describe("forgotPassword (anti-enumeração)", () => {
  it("não envia e-mail nem lança para e-mail inexistente", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
    await expect(forgotPassword("naoexiste@seplag.mt.gov.br")).resolves.toBeUndefined();
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("envia e-mail de reset para usuário ativo", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as never);
    await forgotPassword(baseUser.email);
    expect(sendTransactionalEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(recordAudit).mock.calls.at(-1)?.[0]?.action).toBe("PASSWORD_RESET_REQUESTED");
  });
});
