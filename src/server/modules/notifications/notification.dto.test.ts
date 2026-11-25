import { describe, it, expect } from "vitest";
import type { Notification } from "@prisma/client";
import { toPublicNotification } from "./notification.dto";
import { listNotificationsQuerySchema } from "./notification.schemas";

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "n1",
    userId: "u1",
    title: "Solicitação aprovada",
    message: "Sua solicitação foi aprovada.",
    type: "REQUEST_APPROVED",
    readAt: null,
    relatedEntityType: null,
    relatedEntityId: null,
    createdAt: new Date("2026-06-10T12:00:00.000Z"),
    ...overrides,
  };
}

describe("toPublicNotification", () => {
  it("marca read=false quando readAt é nulo e true caso contrário", () => {
    expect(toPublicNotification(makeNotification()).read).toBe(false);
    expect(toPublicNotification(makeNotification({ readAt: new Date() })).read).toBe(true);
  });

  it("resolve href para VehicleRequest e Caution", () => {
    const reqN = toPublicNotification(
      makeNotification({ relatedEntityType: "VehicleRequest", relatedEntityId: "r1" }),
    );
    expect(reqN.href).toBe("/solicitacoes/r1");

    const cautN = toPublicNotification(
      makeNotification({ relatedEntityType: "Caution", relatedEntityId: "c1" }),
    );
    expect(cautN.href).toBe("/cautelas/c1");
  });

  it("para administradores, aponta para as telas do painel administrativo", () => {
    const n = makeNotification({ relatedEntityType: "Caution", relatedEntityId: "c1" });
    expect(toPublicNotification(n, "admin").href).toBe("/admin/cautelas/c1");
  });

  it("novo cadastro: leva o admin à conta; servidor não tem essa tela", () => {
    const n = makeNotification({ relatedEntityType: "User", relatedEntityId: "u9" });
    expect(toPublicNotification(n, "admin").href).toBe("/admin/usuarios/u9");
    expect(toPublicNotification(n, "user").href).toBeNull();
  });

  it("href é nulo para entidade desconhecida ou ausente", () => {
    expect(
      toPublicNotification(makeNotification({ relatedEntityType: "Foo", relatedEntityId: "x" }))
        .href,
    ).toBeNull();
    expect(toPublicNotification(makeNotification()).href).toBeNull();
  });

  it("createdAt é serializado em ISO", () => {
    expect(toPublicNotification(makeNotification()).createdAt).toBe("2026-06-10T12:00:00.000Z");
  });
});

describe("listNotificationsQuerySchema", () => {
  it("transforma onlyUnread string em boolean", () => {
    expect(listNotificationsQuerySchema.parse({ onlyUnread: "true" }).onlyUnread).toBe(true);
    expect(listNotificationsQuerySchema.parse({ onlyUnread: "false" }).onlyUnread).toBe(false);
  });

  it("aceita ausência de filtros", () => {
    const parsed = listNotificationsQuerySchema.parse({});
    expect(parsed.onlyUnread).toBeUndefined();
    expect(parsed.limit).toBeUndefined();
  });

  it("rejeita limit fora do intervalo", () => {
    expect(() => listNotificationsQuerySchema.parse({ limit: "0" })).toThrow();
    expect(() => listNotificationsQuerySchema.parse({ limit: "101" })).toThrow();
    expect(listNotificationsQuerySchema.parse({ limit: "20" }).limit).toBe(20);
  });
});
