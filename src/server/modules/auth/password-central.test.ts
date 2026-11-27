import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/prisma", () => {
  const prisma = {
    user: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    session: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prisma };
});
vi.mock("@/server/modules/auth/session", () => ({
  createSession: vi.fn(),
  destroyCurrentSession: vi.fn(),
  getCurrentSession: vi.fn(),
  revokeAllSessions: vi.fn(),
}));
vi.mock("@/server/modules/email/email.service", () => ({ sendTransactionalEmail: vi.fn() }));
vi.mock("@/server/modules/notifications/notifications.service", () => ({
  createNotification: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/server/modules/agencies/agency.service", () => ({ listActiveAgencies: vi.fn() }));
vi.mock("@/server/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/server/lib/password", () => ({
  hashPassword: vi.fn(async (p: string) => `HASH(${p})`),
  verifyPassword: vi.fn(async (h: string, p: string) => h === `HASH(${p})`),
}));
vi.mock("@/server/modules/cautions/caution.service", () => ({ CANCELLABLE_CAUTION_STATUSES: [] }));

import { prisma } from "@/server/db/prisma";
import { getCurrentSession, revokeAllSessions } from "@/server/modules/auth/session";
import { recordAudit } from "@/server/lib/audit";
import { createNotification } from "@/server/modules/notifications/notifications.service";
import {
  changeOwnPassword,
  changeTemporaryPassword,
  requestPasswordResetFromCentral,
} from "./auth.service";
import { requireUser } from "./guards";
import { setTemporaryPassword } from "@/server/modules/users/user.service";

const user = {
  id: "u1",
  fullName: "Ana Souza",
  email: "ana@seplag.mt.gov.br",
  role: "USER",
  status: "ACTIVE",
  deletedAt: null,
  passwordHash: "HASH(Antiga#Senha123)",
  mustChangePassword: false,
  passwordResetRequestedAt: null,
};
const admin = { user: { id: "adm1", role: "ADMIN" } } as never;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: "adm1" }] as never);
});

describe("pedido de nova senha à central", () => {
  it("marca o pedido e avisa os administradores uma vez", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
    await requestPasswordResetFromCentral(user.email);
    expect(vi.mocked(prisma.user.update).mock.calls[0]![0]).toMatchObject({
      where: { id: "u1" },
      data: { passwordResetRequestedAt: expect.any(Date) },
    });
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "adm1",
        title: "Pedido de nova senha",
        relatedEntityId: "u1",
      }),
    );
  });

  it("pedido repetido não gera aviso de novo", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...user,
      passwordResetRequestedAt: new Date(),
    } as never);
    await requestPasswordResetFromCentral(user.email);
    expect(createNotification).not.toHaveBeenCalled();
  });

  it("e-mail desconhecido ou conta inativa: silencioso", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
    await expect(requestPasswordResetFromCentral("x@seplag.mt.gov.br")).resolves.toBeUndefined();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...user, status: "BLOCKED" } as never);
    await requestPasswordResetFromCentral(user.email);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(createNotification).not.toHaveBeenCalled();
  });
});

describe("senha provisória gerada pela central", () => {
  it("troca o hash, exige a troca, limpa o pedido, derruba sessões e audita", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      ...user,
      passwordResetRequestedAt: new Date(),
    } as never);
    const { temporaryPassword } = await setTemporaryPassword("u1", admin);
    expect(temporaryPassword).toMatch(/^\S{4}-\S{4}-\S{4}$/);
    expect(vi.mocked(prisma.user.update).mock.calls[0]![0]).toEqual({
      where: { id: "u1" },
      data: {
        passwordHash: `HASH(${temporaryPassword})`,
        mustChangePassword: true,
        passwordResetRequestedAt: null,
      },
    });
    expect(revokeAllSessions).toHaveBeenCalledWith("u1");
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PASSWORD_TEMPORARY_SET",
        actorUserId: "adm1",
        entityId: "u1",
        metadata: { requested: true },
      }),
    );
    // a senha em texto nunca vai para a auditoria
    expect(JSON.stringify(vi.mocked(recordAudit).mock.calls)).not.toContain(temporaryPassword);
  });

  it("admin comum não gera para conta administrativa; ninguém gera para si", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ ...user, role: "ADMIN" } as never);
    await expect(setTemporaryPassword("u1", admin)).rejects.toMatchObject({ code: "FORBIDDEN" });
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ ...user, id: "adm1" } as never);
    await expect(setTemporaryPassword("adm1", admin)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("só para contas ativas", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ ...user, status: "BLOCKED" } as never);
    await expect(setTemporaryPassword("u1", admin)).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("troca obrigatória", () => {
  it("enquanto a troca está pendente, o sistema não libera nada", async () => {
    vi.mocked(getCurrentSession).mockResolvedValue({
      session: { id: "s", expiresAt: new Date() },
      user: { ...user, mustChangePassword: true },
    } as never);
    await expect(requireUser()).rejects.toMatchObject({ code: "PASSWORD_CHANGE_REQUIRED" });
  });

  it("aceita senha nova diferente da provisória e libera o acesso", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...user,
      mustChangePassword: true,
      passwordHash: "HASH(Kq7m-R4tz-9WhP)",
    } as never);
    await expect(changeTemporaryPassword("u1", "Kq7m-R4tz-9WhP")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    await changeTemporaryPassword("u1", "Minha#Nova2026");
    expect(vi.mocked(prisma.user.update).mock.calls.at(-1)![0]).toEqual({
      where: { id: "u1" },
      data: { passwordHash: "HASH(Minha#Nova2026)", mustChangePassword: false },
    });
  });

  it("sem troca pendente, recusa", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
    await expect(changeTemporaryPassword("u1", "Minha#Nova2026")).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});

describe("troca da própria senha pelo perfil", () => {
  it("confere a senha atual, grava a nova e derruba só as outras sessões", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
    await changeOwnPassword("u1", "sess-atual", "Antiga#Senha123", "Nova#Senha2026x");
    expect(vi.mocked(prisma.user.update).mock.calls[0]![0]).toMatchObject({
      where: { id: "u1" },
      data: { passwordHash: "HASH(Nova#Senha2026x)", mustChangePassword: false },
    });
    expect(vi.mocked(prisma.session.updateMany).mock.calls[0]![0]).toMatchObject({
      where: { userId: "u1", revokedAt: null, id: { not: "sess-atual" } },
    });
    expect(vi.mocked(recordAudit).mock.calls[0]![0]).toMatchObject({
      action: "PASSWORD_RESET_COMPLETED",
      metadata: { via: "self" },
    });
  });

  it("recusa senha atual errada sem gravar nada", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
    await expect(
      changeOwnPassword("u1", "s", "Errada#Senha123", "Nova#Senha2026x"),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.session.updateMany).not.toHaveBeenCalled();
  });

  it("recusa repetir a senha atual", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
    await expect(
      changeOwnPassword("u1", "s", "Antiga#Senha123", "Antiga#Senha123"),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("conta inativa não troca a senha", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...user, status: "BLOCKED" } as never);
    await expect(
      changeOwnPassword("u1", "s", "Antiga#Senha123", "Nova#Senha2026x"),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
