import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/prisma", () => {
  const prisma = {
    user: { create: vi.fn(), findMany: vi.fn() },
    emailVerificationToken: { create: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
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
  sendTransactionalEmail: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock("@/server/modules/notifications/notifications.service", () => ({
  createNotification: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/server/modules/agencies/agency.service", () => ({
  listActiveAgencies: vi.fn().mockResolvedValue([{ id: "a1", name: "SES - Saúde" }]),
}));
vi.mock("@/server/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/server/lib/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("HASH"),
  verifyPassword: vi.fn(),
}));

import { prisma } from "@/server/db/prisma";
import { sendTransactionalEmail } from "@/server/modules/email/email.service";
import { createNotification } from "@/server/modules/notifications/notifications.service";
import { EMAIL_DELIVERY_ENABLED } from "@/shared/features";
import { registerUser } from "./auth.service";

const input = {
  fullName: "Ana Paula Souza",
  cpf: "52998224725",
  registrationNumber: "123",
  email: "ana@seplag.mt.gov.br",
  phone: "65999990000",
  sector: "Qualidade",
  department: "Sede",
  agency: "SES - Saúde",
  password: "Senha#Forte2026",
  confirmPassword: "Senha#Forte2026",
};

describe("cadastro liberado pela central", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "u1",
      fullName: input.fullName,
      email: input.email,
      agency: input.agency,
      role: "USER",
    } as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: "adm1" }, { id: "adm2" }] as never);
  });

  it("com o e-mail desligado, não manda confirmação e cria a conta aguardando liberação", async () => {
    expect(EMAIL_DELIVERY_ENABLED).toBe(false);
    await registerUser(input as never);
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.user.create).mock.calls[0]![0]).toMatchObject({
      data: { status: "PENDING_EMAIL_VERIFICATION", role: "USER" },
    });
  });

  it("avisa cada administrador ativo na plataforma, com link para a conta", async () => {
    await registerUser(input as never);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, status: "ACTIVE" },
      select: { id: true },
    });
    expect(createNotification).toHaveBeenCalledTimes(2);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "adm1",
        title: "Novo cadastro aguardando liberação",
        message: "Ana Paula Souza (SES) criou uma conta e aguarda a liberação do acesso.",
        relatedEntityType: "User",
        relatedEntityId: "u1",
      }),
    );
  });
});
