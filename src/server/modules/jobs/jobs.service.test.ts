import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/db/prisma", () => {
  const prisma = {
    caution: { findMany: vi.fn(), update: vi.fn() },
    session: { deleteMany: vi.fn() },
    emailVerificationToken: { deleteMany: vi.fn() },
    passwordResetToken: { deleteMany: vi.fn() },
    $transaction: vi.fn(async (arg: unknown) =>
      typeof arg === "function"
        ? (arg as (tx: unknown) => unknown)(prisma)
        : Promise.all(arg as Promise<unknown>[]),
    ),
  };
  return { prisma };
});
vi.mock("@/server/modules/notifications/notifications.service", () => ({
  createNotification: vi.fn(),
}));
vi.mock("@/server/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/server/modules/email/email.service", () => ({
  sendTransactionalEmail: vi.fn().mockResolvedValue({ ok: true, emailLogId: "l" }),
}));

import { prisma } from "@/server/db/prisma";
import { createNotification } from "@/server/modules/notifications/notifications.service";
import { sendTransactionalEmail } from "@/server/modules/email/email.service";
import {
  markOverdueCautions,
  sendWithdrawalReminders,
  sendReturnReminders,
  cleanupExpiredAuth,
  runScheduledJobs,
} from "./jobs.service";

const user = { email: "joao@seplag.mt.gov.br", fullName: "João" };
const vehicle = { brand: "Fiat", model: "Argo", plate: "ABC1D23" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("markOverdueCautions", () => {
  it("marca ATRASADA, notifica e envia e-mail por cautela vencida", async () => {
    vi.mocked(prisma.caution.findMany).mockResolvedValue([
      {
        id: "c1",
        userId: "u1",
        publicCode: "CTL-1",
        plannedReturnAt: new Date("2026-06-09T18:00:00Z"),
        user,
        vehicle,
      },
    ] as never);

    const count = await markOverdueCautions(new Date("2026-06-10T00:00:00Z"));

    expect(count).toBe(1);
    expect(prisma.caution.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { status: "ATRASADA" },
    });
    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(sendTransactionalEmail).toHaveBeenCalledTimes(1);
  });

  it("só considera estados com veículo fora e prazo vencido", async () => {
    vi.mocked(prisma.caution.findMany).mockResolvedValue([] as never);
    await markOverdueCautions(new Date("2026-06-10T00:00:00Z"));
    const where = vi.mocked(prisma.caution.findMany).mock.calls[0]?.[0]?.where;
    expect(where?.status).toEqual({ in: ["EM_USO", "AGUARDANDO_DEVOLUCAO"] });
    expect(where?.plannedReturnAt).toEqual({ lt: new Date("2026-06-10T00:00:00Z") });
  });
});

describe("sendWithdrawalReminders / sendReturnReminders", () => {
  it("envia lembrete e marca o flag anti-duplicidade (retirada)", async () => {
    vi.mocked(prisma.caution.findMany).mockResolvedValue([
      {
        id: "c1",
        publicCode: "CTL-1",
        plannedWithdrawalAt: new Date("2026-06-10T08:00:00Z"),
        user,
        vehicle,
      },
    ] as never);

    const count = await sendWithdrawalReminders(new Date("2026-06-10T00:00:00Z"));

    expect(count).toBe(1);
    expect(sendTransactionalEmail).toHaveBeenCalledTimes(1);
    expect(prisma.caution.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { withdrawalReminderSentAt: expect.any(Date) },
    });
  });

  it("filtra por status, flag nulo e janela de antecedência (devolução)", async () => {
    vi.mocked(prisma.caution.findMany).mockResolvedValue([] as never);
    await sendReturnReminders(new Date("2026-06-10T00:00:00Z"));
    const where = vi.mocked(prisma.caution.findMany).mock.calls[0]?.[0]?.where;
    expect(where?.status).toBe("EM_USO");
    expect(where?.returnReminderSentAt).toBeNull();
    // janela de 24h à frente
    expect(where?.plannedReturnAt).toEqual({
      lte: new Date("2026-06-11T00:00:00Z"),
    });
  });
});

describe("cleanupExpiredAuth", () => {
  it("agrega as contagens de remoção", async () => {
    vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 3 } as never);
    vi.mocked(prisma.emailVerificationToken.deleteMany).mockResolvedValue({
      count: 2,
    } as never);
    vi.mocked(prisma.passwordResetToken.deleteMany).mockResolvedValue({
      count: 1,
    } as never);

    const result = await cleanupExpiredAuth();
    expect(result).toEqual({ sessions: 3, emailTokens: 2, resetTokens: 1 });
  });
});

describe("runScheduledJobs", () => {
  it("isola falha de um job sem derrubar os demais", async () => {
    vi.mocked(prisma.caution.findMany).mockRejectedValue(new Error("db down"));
    vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 5 } as never);
    vi.mocked(prisma.emailVerificationToken.deleteMany).mockResolvedValue({
      count: 0,
    } as never);
    vi.mocked(prisma.passwordResetToken.deleteMany).mockResolvedValue({
      count: 0,
    } as never);

    const result = await runScheduledJobs();

    expect(result.overdueCautions).toBe(0);
    expect(result.withdrawalReminders).toBe(0);
    expect(result.returnReminders).toBe(0);
    expect(result.cleanup.sessions).toBe(5);
  });
});
