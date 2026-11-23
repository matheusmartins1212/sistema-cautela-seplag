"use client";

import { useEffect, useRef, useState } from "react";
import type { PhotoType } from "@prisma/client";
import { Alert } from "@/components/ui/alert";

interface PhotoMeta {
  id: string;
  type: PhotoType;
  checklistItemId: string | null;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}

interface Props {
  checklistId: string;
  defaultType?: PhotoType;
  itemKey?: string;
  /** Id do item do checklist; usado para mostrar só as fotos daquele item. */
  checklistItemId?: string;
  /** Quando true, mostra apenas as fotos vinculadas ao item. */
  itemScope?: boolean;
  /** Marca este uploader como obrigatório (mostra label vermelho quando vazio). */
  required?: boolean;
  /** Uma única foto: depois de enviada, para trocar é preciso remover a atual. */
  single?: boolean;
  label?: string;
}

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES_DEFAULT = 8 * 1024 * 1024;

export function PhotoUploader({
  checklistId,
  defaultType,
  itemKey,
  checklistItemId,
  itemScope,
  required,
  single,
  label,
}: Props) {
  const [photos, setPhotos] = useState<PhotoMeta[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    const res = await fetch(`/api/checklists/${checklistId}/photos`, {
      credentials: "same-origin",
    });
    const json = await res.json().catch(() => null);
    if (json && json.ok) {
      const items = (json.data.items as PhotoMeta[]) ?? [];
      setPhotos(items);
    } else {
      setPhotos([]);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklistId]);

  // Cada campo mostra só as próprias fotos: as de um item ficam no item, e as
  // gerais (dianteira, painel, avaria...) ficam no campo do seu tipo.
  const visible = (photos ?? []).filter((p) => {
    if (itemScope) return checklistItemId ? p.checklistItemId === checklistItemId : false;
    return p.checklistItemId === null && p.type === (defaultType ?? "OUTRA");
  });

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    for (const file of Array.from(files).slice(0, single ? 1 : undefined)) {
      if (file.size > MAX_BYTES_DEFAULT) {
        setError(`Arquivo "${file.name}" excede 8MB.`);
        continue;
      }
      const fd = new FormData();
      fd.set("file", file);
      fd.set("type", defaultType ?? "OUTRA");
      if (itemKey) fd.set("itemKey", itemKey);
      const res = await fetch(`/api/checklists/${checklistId}/photos`, {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const json = await res.json().catch(() => null);
      if (!json || !json.ok) {
        setError(json?.error?.message ?? "Falha ao enviar foto.");
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    await load();
  }

  async function onDelete(id: string) {
    setError(null);
    const res = await fetch(`/api/checklists/${checklistId}/photos/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const json = await res.json().catch(() => null);
    if (!json || !json.ok) {
      setError(json?.error?.message ?? "Falha ao remover foto.");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-medium uppercase tracking-wide text-gray-600">
          {label}
          {required && visible.length === 0 && (
            <span className="ml-1 text-danger">* obrigatória</span>
          )}
        </p>
      )}

      {error && <Alert tone="error">{error}</Alert>}

      <div className="flex flex-wrap gap-3">
        {visible.map((p) => (
          <div
            key={p.id}
            className="relative h-24 w-24 overflow-hidden rounded-md border border-gray-300 bg-gray-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onDelete(p.id)}
              className="absolute right-1 top-1 rounded-full bg-danger/90 px-1.5 text-[10px] font-semibold text-white"
              aria-label="Remover foto"
            >
              ×
            </button>
          </div>
        ))}

        {(!single || (photos !== null && visible.length === 0)) && (
          <label className="inline-flex h-24 w-24 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-white text-center text-[11px] font-medium text-gray-500 hover:bg-gray-50">
            {uploading ? "Enviando…" : single ? "+ Foto" : "+ Adicionar"}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple={!single}
              aria-label={label ? `Foto: ${label}` : "Adicionar foto"}
              className="hidden"
              onChange={(e) => onUpload(e.target.files)}
            />
          </label>
        )}
      </div>
    </div>
  );
}
