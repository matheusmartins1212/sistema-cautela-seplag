import { describe, expect, it, vi, beforeEach } from "vitest";

const afterMock = vi.fn();
vi.mock("next/server", () => ({ after: (task: () => unknown) => afterMock(task) }));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    emailLog: {
      create: vi.fn().mockResolvedValue({ id: "log1" }),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));
const send = vi.fn().mockResolvedValue({ providerMessageId: "m1" });
vi.mock("@/server/modules/email/provider-factory", () => ({
  getEmailProvider: () => ({ name: "console", send }),
}));

import { sendEmailAfterResponse } from "./email.service";

const message = { to: "a@b.gov.br", subject: "s", html: "<p>x</p>", text: "x", template: "T" };

describe("sendEmailAfterResponse", () => {
  beforeEach(() => {
    afterMock.mockReset();
    send.mockClear();
  });

  it("entrega o envio ao after, para a Vercel não cortar a função", async () => {
    sendEmailAfterResponse(message as never);
    expect(afterMock).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
    await afterMock.mock.calls[0]![0]();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("fora de uma requisição, envia direto", async () => {
    afterMock.mockImplementation(() => {
      throw new Error("outside request scope");
    });
    sendEmailAfterResponse(message as never);
    await new Promise((r) => setImmediate(r));
    expect(send).toHaveBeenCalledTimes(1);
  });
});
