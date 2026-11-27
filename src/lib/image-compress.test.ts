import { describe, expect, it } from "vitest";
import { fitWithin, jpegName, PHOTO_MAX_UPLOAD_BYTES } from "./image-compress";

describe("redução das fotos antes do envio", () => {
  it("limita o lado maior a 1280 px mantendo a proporção", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 960, height: 1280 });
    expect(fitWithin(4032, 1816)).toEqual({ width: 1280, height: 577 });
  });

  it("não amplia fotos menores que o limite", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("ignora dimensões inválidas", () => {
    expect(fitWithin(0, 600)).toEqual({ width: 0, height: 0 });
  });

  it("troca a extensão para .jpg", () => {
    expect(jpegName("IMG_2031.HEIC")).toBe("IMG_2031.jpg");
    expect(jpegName("painel.png")).toBe("painel.jpg");
    expect(jpegName("sem-extensao")).toBe("sem-extensao.jpg");
    expect(jpegName(".png")).toBe("foto.jpg");
  });

  it("o teto do envio fica abaixo dos 4,5 MB da Vercel", () => {
    expect(PHOTO_MAX_UPLOAD_BYTES).toBeLessThan(4.5 * 1024 * 1024);
  });
});
