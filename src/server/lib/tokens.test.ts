import { describe, it, expect } from "vitest";
import { generateRawToken, hashToken } from "./tokens";

describe("tokens", () => {
  it("gera tokens crus distintos e url-safe", () => {
    const a = generateRawToken();
    const b = generateRawToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/); // base64url
  });

  it("hash é determinístico e de 64 hex (HMAC-SHA-256)", () => {
    const token = "abc123";
    expect(hashToken(token, "session")).toBe(hashToken(token, "session"));
    expect(hashToken(token, "session")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashes de tokens diferentes divergem", () => {
    expect(hashToken("a", "session")).not.toBe(hashToken("b", "session"));
  });

  it("o mesmo token gera hashes distintos por finalidade (domain separation)", () => {
    const token = generateRawToken();
    expect(hashToken(token, "session")).not.toBe(hashToken(token, "email"));
  });
});
