import { Readable } from "node:stream";
import { randomBytes } from "node:crypto";
import { env } from "@/server/config/env";
import { logger } from "@/server/lib/logger";
import type { StorageProvider, StoragePutInput, StoredFile } from "./storage.types";

/**
 * Storage no Supabase Storage (bucket PRIVADO), via API REST.
 *
 * Necessário em plataformas serverless (Vercel), onde o disco não persiste.
 * - fileKey segue o mesmo formato do provider local: yyyy/mm/<random>.<ext>.
 * - O bucket é privado: as fotos só saem pela rota autenticada /api/photos/[id].
 * - A chave secreta (service role) fica apenas no servidor.
 */

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function sanitizeKey(rawKey: string): string {
  if (rawKey.includes("..") || rawKey.includes("\\") || !/^[A-Za-z0-9/_.-]+$/.test(rawKey)) {
    throw new Error("fileKey inválida");
  }
  return rawKey;
}

export class SupabaseStorageProvider implements StorageProvider {
  readonly name = "supabase";
  private readonly baseUrl: string;
  private readonly bucket: string;
  private readonly key: string;

  constructor() {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Storage Supabase requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
    }
    this.baseUrl = env.SUPABASE_URL.replace(/\/+$/, "");
    this.bucket = env.SUPABASE_STORAGE_BUCKET;
    this.key = env.SUPABASE_SERVICE_ROLE_KEY;
  }

  private objectUrl(fileKey: string): string {
    return `${this.baseUrl}/storage/v1/object/${encodeURIComponent(this.bucket)}/${fileKey}`;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return { apikey: this.key, authorization: `Bearer ${this.key}`, ...extra };
  }

  async put(input: StoragePutInput): Promise<StoredFile> {
    const ext = EXT_BY_MIME[input.mimeType];
    if (!ext) {
      throw new Error(`MIME não suportado: ${input.mimeType}`);
    }

    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const rand = randomBytes(16).toString("hex");
    const fileKey = `${year}/${month}/${rand}.${ext}`;

    const res = await fetch(this.objectUrl(fileKey), {
      method: "POST",
      headers: this.headers({ "content-type": input.mimeType, "x-upsert": "false" }),
      body: new Uint8Array(input.buffer),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Falha no upload para o Supabase Storage (${res.status}): ${detail}`);
    }

    return { fileKey, mimeType: input.mimeType, size: input.buffer.byteLength };
  }

  async get(fileKey: string): Promise<{ stream: NodeJS.ReadableStream; size: number }> {
    const safe = sanitizeKey(fileKey);
    const res = await fetch(this.objectUrl(safe), { headers: this.headers() });
    if (!res.ok || !res.body) {
      throw new Error(`Arquivo não encontrado no Supabase Storage (${res.status})`);
    }
    const size = Number(res.headers.get("content-length") ?? 0);
    const stream = Readable.fromWeb(res.body as import("node:stream/web").ReadableStream);
    return { stream, size };
  }

  async remove(fileKey: string): Promise<void> {
    const safe = sanitizeKey(fileKey);
    try {
      const res = await fetch(this.objectUrl(safe), { method: "DELETE", headers: this.headers() });
      if (!res.ok && res.status !== 404) {
        throw new Error(`status ${res.status}`);
      }
    } catch (error) {
      logger.error("Falha ao remover arquivo do Supabase Storage", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }
}
