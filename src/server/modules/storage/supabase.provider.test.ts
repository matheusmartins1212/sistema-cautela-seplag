import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/server/config/env", () => ({
  env: {
    SUPABASE_URL: "https://abc.supabase.co/",
    SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test",
    SUPABASE_STORAGE_BUCKET: "checklist-photos",
    UPLOAD_MAX_BYTES: 4194304,
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { SupabaseStorageProvider } = await import("./supabase.provider");

describe("SupabaseStorageProvider", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envia a foto ao bucket privado com chave opaca e cabeçalhos de autenticação", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    const provider = new SupabaseStorageProvider();
    const stored = await provider.put({
      buffer: Buffer.from("img"),
      mimeType: "image/jpeg",
      originalName: "../../etc/passwd.jpg",
    });

    expect(stored.fileKey).toMatch(/^\d{4}\/\d{2}\/[a-f0-9]{32}\.jpg$/);
    expect(stored.size).toBe(3);
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(url).toBe(
      `https://abc.supabase.co/storage/v1/object/checklist-photos/${stored.fileKey}`,
    );
    expect(init.method).toBe("POST");
    expect(init.headers.apikey).toBe("sb_secret_test");
    expect(init.headers.authorization).toBe("Bearer sb_secret_test");
    expect(init.headers["content-type"]).toBe("image/jpeg");
  });

  it("rejeita MIME não suportado", async () => {
    const provider = new SupabaseStorageProvider();
    await expect(
      provider.put({ buffer: Buffer.from("x"), mimeType: "text/html", originalName: "a.html" }),
    ).rejects.toThrow("MIME");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lê a foto como stream Node", async () => {
    fetchMock.mockResolvedValue(
      new Response("conteudo", { status: 200, headers: { "content-length": "8" } }),
    );
    const provider = new SupabaseStorageProvider();
    const { stream, size } = await provider.get("2026/11/abc.jpg");
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks).toString()).toBe("conteudo");
    expect(size).toBe(8);
  });

  it("bloqueia path traversal na leitura", async () => {
    const provider = new SupabaseStorageProvider();
    await expect(provider.get("../segredo")).rejects.toThrow("fileKey inválida");
  });

  it("não lança erro quando a remoção falha", async () => {
    fetchMock.mockRejectedValue(new Error("rede"));
    const provider = new SupabaseStorageProvider();
    await expect(provider.remove("2026/11/abc.jpg")).resolves.toBeUndefined();
  });

  it("cria o bucket privado no primeiro envio e tenta de novo", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          '{"statusCode":"404","error":"Bucket not found","message":"Bucket not found"}',
          {
            status: 400,
          },
        ),
      )
      .mockResolvedValueOnce(new Response('{"name":"checklist-photos"}', { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    const provider = new SupabaseStorageProvider();
    const stored = await provider.put({
      buffer: Buffer.from([0xff, 0xd8, 0xff]),
      mimeType: "image/jpeg",
      originalName: "x.jpg",
    });
    expect(stored.fileKey).toMatch(/^\d{4}\/\d{2}\/[a-f0-9]{32}\.jpg$/);
    const [bucketUrl, bucketInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(bucketUrl).toBe("https://abc.supabase.co/storage/v1/bucket");
    expect(JSON.parse(String(bucketInit.body))).toMatchObject({
      id: "checklist-photos",
      public: false,
      file_size_limit: 4194304,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("não insiste se o bucket não puder ser criado", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('{"error":"Bucket not found"}', { status: 400 }))
      .mockResolvedValueOnce(new Response('{"error":"forbidden"}', { status: 403 }));
    const provider = new SupabaseStorageProvider();
    await expect(
      provider.put({ buffer: Buffer.from([0xff]), mimeType: "image/jpeg", originalName: "x.jpg" }),
    ).rejects.toThrow(/Falha no upload/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
