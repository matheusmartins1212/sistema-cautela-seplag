/**
 * Abstração de storage para fotos do checklist. Trocar `local` por `s3` no
 * `.env` (STORAGE_DRIVER) não deve afetar a camada de domínio.
 */
export interface StoredFile {
  fileKey: string; // chave opaca interna (nunca o nome original)
  mimeType: string;
  size: number;
}

export interface StoragePutInput {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

export interface StorageProvider {
  readonly name: string;
  put(input: StoragePutInput): Promise<StoredFile>;
  get(fileKey: string): Promise<{ stream: NodeJS.ReadableStream; size: number }>;
  remove(fileKey: string): Promise<void>;
}
