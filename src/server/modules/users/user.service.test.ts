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
import { setUserStatus, changeUserRole, listUsers } from "./user.service";

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

  it("não bloqueia conta pendente de confirmação", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(
      target({ status: "PENDING_EMAIL_VERIFICATION" }) as never,
    );
    await expect(
      setUserStatus("u-target", { status: "BLOCKED" }, actorOf("admin", "ADMIN")),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("confirma manualmente conta pendente, marcando o e-mail como verificado", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(
      target({ status: "PENDING_EMAIL_VERIFICATION" }) as never,
    );
    vi.mocked(prisma.user.update).mockResolvedValue(target() as never);

    await setUserStatus("u-target", { status: "ACTIVE" }, actorOf("admin", "ADMIN"));

    const data = vi.mocked(prisma.user.update).mock.calls[0]?.[0]?.data as {
      status: string;
      emailVerifiedAt?: Date;
    };
    expect(data.status).toBe("ACTIVE");
    expect(data.emailVerifiedAt).toBeInstanceOf(Date);
    const audit = vi.mocked(recordAudit).mock.calls[0]?.[0];
    expect(audit?.action).toBe("USER_ACTIVATED");
    expect(audit?.metadata).toMatchObject({ manualEmailConfirmation: true });
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

describe("listUsers", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
  });

  function lastWhere() {
    return vi.mocked(prisma.user.count).mock.calls[0]?.[0]?.where as {
      OR: Array<Record<string, { contains: string }>>;
    };
  }

  it("busca por nome não envia filtro de CPF nem caracteres nulos ao banco", async () => {
    await listUsers({ search: "Ana Paula", page: 1, pageSize: 20 } as never);
    const where = lastWhere();
    expect(where.OR.some((c) => "cpf" in c)).toBe(false);
    expect(JSON.stringify(where)).not.toContain("\\u0000");
  });

  it("busca com dígitos inclui o CPF só com os números", async () => {
    await listUsers({ search: "529.982", page: 1, pageSize: 20 } as never);
    expect(lastWhere().OR).toContainEqual({ cpf: { contains: "529982" } });
  });
});
