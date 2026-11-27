import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/prisma", () => ({ prisma: {} }));
vi.mock("@/server/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/server/modules/storage/local.provider", () => ({ getStorage: vi.fn() }));

import { detectImageMime } from "./checklist-photo.service";

describe("assinatura das imagens enviadas", () => {
  it("reconhece JPEG, PNG e WebP pelos primeiros bytes", () => {
    expect(detectImageMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]))).toBe("image/jpeg");
    expect(
      detectImageMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])),
    ).toBe("image/png");
    expect(detectImageMime(Buffer.from("RIFF\x00\x00\x00\x00WEBPVP8 ", "latin1"))).toBe(
      "image/webp",
    );
  });

  it("recusa arquivos que só dizem ser imagem", () => {
    expect(detectImageMime(Buffer.from("<html><script>alert(1)</script>"))).toBeNull();
    expect(detectImageMime(Buffer.from("%PDF-1.7"))).toBeNull();
    expect(detectImageMime(Buffer.alloc(0))).toBeNull();
  });
});
