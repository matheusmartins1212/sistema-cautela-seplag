import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/db/prisma", () => {
  const prisma = {
    user: { findFirst: vi.fn(), update: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(async (arr: Promise<unknown>[]) => Promise.all(arr)),
  };
  return { prisma };
});
vi.mock("@/server/modules/auth/session", () => ({
  revokeAllSessions: vi.fn(),
}));
vi.mock("@/server/lib/audit", () => ({ recordAudit: vi.fn() }));

import { prisma } from "@/server/db/prisma";
import { revokeAllSessions } from "@/server/modules/auth/session";
import { recordAudit } from "@/server/lib/audit";
import { setUserStatus, changeUserRole } from "./user.service";

type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

function actorOf(id: string, role: Role) {
  return { session: { id: "s", expiresAt: new Date() }, user: { id, role } } as never;
}

function target(overrides: Record<string, unknown> = {}) {
  return {
    id: "u-target",
    role: "USER",
    status: "ACTIVE",
    deletedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("setUserStatus", () => {
  it("impede alterar a própria conta", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(target({ id: "me" }) as never);
    await expect(
      setUserStatus("me", { status: "BLOCKED" }, actorOf("me", "SUPER_ADMIN")),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("impede ADMIN comum de gerenciar conta administrativa", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(target({ role: "ADMIN" }) as never);
    await expect(
      setUserStatus("u-target", { status: "BLOCKED" }, actorOf("admin", "ADMIN")),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("bloqueia um USER, revoga sessões e audita USER_DEACTIVATED", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(target() as never);
    vi.mocked(prisma.user.update).mockResolvedValue(target({ status: "BLOCKED" }) as never);

    await setUserStatus(
      "u-target",
      { status: "BLOCKED", reason: "afastamento" },
      actorOf("admin", "ADMIN"),
    );

    expect(revokeAllSessions).toHaveBeenCalledWith("u-target");
    expect(vi.mocked(recordAudit).mock.calls[0]?.[0]?.action).toBe("USER_DEACTIVATED");
  });

  it("não reativa conta pendente de confirmação", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(
      target({ status: "PENDING_EMAIL_VERIFICATION" }) as never,
    );
    await expect(
      setUserStatus("u-target", { status: "ACTIVE" }, actorOf("admin", "ADMIN")),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("ativar não revoga sessões e audita USER_ACTIVATED", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(target({ status: "BLOCKED" }) as never);
    vi.mocked(prisma.user.update).mockResolvedValue(target() as never);

    await setUserStatus("u-target", { status: "ACTIVE" }, actorOf("admin", "ADMIN"));

    expect(revokeAllSessions).not.toHaveBeenCalled();
    expect(vi.mocked(recordAudit).mock.calls[0]?.[0]?.action).toBe("USER_ACTIVATED");
  });
});

describe("changeUserRole", () => {
  it("nega para ator que não é SUPER_ADMIN", async () => {
    await expect(
      changeUserRole("u-target", { role: "ADMIN" }, actorOf("admin", "ADMIN")),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("impede alterar o próprio papel", async () => {
    await expect(
      changeUserRole("boss", { role: "USER" }, actorOf("boss", "SUPER_ADMIN")),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("promove USER e audita USER_ROLE_CHANGED", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(target() as never);
    vi.mocked(prisma.user.update).mockResolvedValue(target({ role: "ADMIN" }) as never);

    await changeUserRole("u-target", { role: "ADMIN" }, actorOf("boss", "SUPER_ADMIN"));

    expect(vi.mocked(recordAudit).mock.calls[0]?.[0]?.action).toBe("USER_ROLE_CHANGED");
  });
});
