import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { env } from "@/server/config/env";
import { logger } from "@/server/lib/logger";
import type { StorageProvider, StoragePutInput, StoredFile } from "./storage.types";
import { SupabaseStorageProvider } from "./supabase.provider";

/**
 * Storage local: escreve em STORAGE_LOCAL_DIR/yyyy/mm/<random>.<ext>.
 *
 * - fileKey é uma chave opaca (path relativo dentro do diretório).
 * - Nome original NUNCA vai pro disco (mitigação de path traversal / scripts).
 * - Servido apenas via API com autorização (não exposto estaticamente).
 */

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function resolveBaseDir(): string {
  const dir = env.STORAGE_LOCAL_DIR;
  return path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
}

function sanitizeKey(rawKey: string): string {
  // fileKey só pode ter ASCII básico + barras simples; rejeita ../, \, espaços.
  if (rawKey.includes("..") || rawKey.includes("\\") || !/^[A-Za-z0-9/_.-]+$/.test(rawKey)) {
    throw new Error("fileKey inválida");
  }
  return rawKey;
}

class LocalStorageProvider implements StorageProvider {
  readonly name = "local";
  private readonly baseDir = resolveBaseDir();

  async put(input: StoragePutInput): Promise<StoredFile> {
    const ext = EXT_BY_MIME[input.mimeType];
    if (!ext) {
      throw new Error(`MIME não suportado: ${input.mimeType}`);
    }

    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const rand = randomBytes(16).toString("hex");
    const relativePath = path.posix.join(year, month, `${rand}.${ext}`);
    const fullPath = path.join(this.baseDir, year, month, `${rand}.${ext}`);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, input.buffer, { mode: 0o600 });

    return {
      fileKey: relativePath,
      mimeType: input.mimeType,
      size: input.buffer.byteLength,
    };
  }

  async get(fileKey: string): Promise<{ stream: NodeJS.ReadableStream; size: number }> {
    const safe = sanitizeKey(fileKey);
    const fullPath = path.join(this.baseDir, safe);
    const stat = await fs.stat(fullPath);
    return { stream: createReadStream(fullPath), size: stat.size };
  }

  async remove(fileKey: string): Promise<void> {
    const safe = sanitizeKey(fileKey);
    const fullPath = path.join(this.baseDir, safe);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      logger.error("Falha ao remover arquivo do storage local", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }
}

let cached: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (cached) return cached;
  if (env.STORAGE_DRIVER === "s3") {
    throw new Error("STORAGE_DRIVER=s3 ainda não implementado. Use 'supabase' ou 'local'.");
  }
  cached =
    env.STORAGE_DRIVER === "supabase" ? new SupabaseStorageProvider() : new LocalStorageProvider();
  return cached;
}
