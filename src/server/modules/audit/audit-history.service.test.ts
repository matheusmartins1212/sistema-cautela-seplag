import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/prisma", () => ({ prisma: {} }));

import { buildAccountHistoryWhere } from "./audit-history.service";

describe("histórico da conta", () => {
  it("traz só o que a própria conta fez", () => {
    expect(buildAccountHistoryWhere("u1")).toEqual({ actorUserId: "u1" });
  });

  it("filtra por grupo de ações; grupo desconhecido é ignorado", () => {
    expect(buildAccountHistoryWhere("u1", "orgaos")).toEqual({
      actorUserId: "u1",
      action: { in: ["AGENCY_CREATED", "AGENCY_UPDATED", "AGENCY_DELETED"] },
    });
    expect(buildAccountHistoryWhere("u1", "xyz")).toEqual({ actorUserId: "u1" });
  });
});
