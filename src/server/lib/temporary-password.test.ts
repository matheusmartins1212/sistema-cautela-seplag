import { describe, expect, it } from "vitest";
import { isStrongPassword } from "@/shared/validation/password";
import { generateTemporaryPassword } from "./temporary-password";

describe("senha provisória", () => {
  it("atende à política e ao formato de três blocos", () => {
    for (let i = 0; i < 200; i++) {
      const p = generateTemporaryPassword();
      expect(p).toMatch(/^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/);
      expect(isStrongPassword(p)).toBe(true);
      expect(p).not.toMatch(/[01OIl]/);
    }
  });

  it("não se repete", () => {
    const set = new Set(Array.from({ length: 500 }, generateTemporaryPassword));
    expect(set.size).toBe(500);
  });
});
