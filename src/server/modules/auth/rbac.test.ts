import { describe, it, expect } from "vitest";
import { hasAtLeastRole, isAdmin, isSuperAdmin } from "./rbac";

describe("RBAC", () => {
  it("respeita a hierarquia USER < ADMIN < SUPER_ADMIN", () => {
    expect(hasAtLeastRole("USER", "USER")).toBe(true);
    expect(hasAtLeastRole("USER", "ADMIN")).toBe(false);
    expect(hasAtLeastRole("ADMIN", "USER")).toBe(true);
    expect(hasAtLeastRole("ADMIN", "SUPER_ADMIN")).toBe(false);
    expect(hasAtLeastRole("SUPER_ADMIN", "ADMIN")).toBe(true);
  });

  it("isAdmin abrange ADMIN e SUPER_ADMIN", () => {
    expect(isAdmin("USER")).toBe(false);
    expect(isAdmin("ADMIN")).toBe(true);
    expect(isAdmin("SUPER_ADMIN")).toBe(true);
  });

  it("isSuperAdmin é exclusivo", () => {
    expect(isSuperAdmin("ADMIN")).toBe(false);
    expect(isSuperAdmin("SUPER_ADMIN")).toBe(true);
  });
});
