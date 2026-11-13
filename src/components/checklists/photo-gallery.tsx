"use client";

import { useEffect, useState } from "react";

interface PhotoMeta {
  id: string;
  type: string;
  checklistItemId: string | null;
  url: string;
  size: number;
  mimeType: string;
  originalName: string;
}

interface Props {
  checklistId: string;
}

const TYPE_LABEL: Record<string, string> = {
  DIANTEIRA: "Dianteira",
  TRASEIRA: "Traseira",
  LATERAL_ESQUERDA: "Lateral esquerda",
  LATERAL_DIREITA: "Lateral direita",
  INTERIOR: "Interior",
  PAINEL: "Painel",
  QUILOMETRAGEM: "Quilometragem",
  COMBUSTIVEL: "Combustível",
  LOCAL_ESTACIONADO: "Local estacionado",
  AVARIA: "Avaria",
  ITEM: "Item",
  OUTRA: "Outra",
};

export function PhotoGallery({ checklistId }: Props) {
  const [photos, setPhotos] = useState<PhotoMeta[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/checklists/${checklistId}/photos`, {
        credentials: "same-origin",
      });
      const json = await res.json().catch(() => null);
      if (json && json.ok) {
        setPhotos(json.data.items as PhotoMeta[]);
      } else {
        setPhotos([]);
      }
    })();
  }, [checklistId]);

  if (photos === null) return <p className="text-sm text-gray-500">Carregando…</p>;
  if (photos.length === 0)
    return <p className="text-sm text-gray-500">Nenhuma foto anexada a este checklist.</p>;

  const opened = photos.find((p) => p.id === openId) ?? null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {photos.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpenId(p.id)}
            className="group flex flex-col gap-1 overflow-hidden rounded-md border border-gray-200 bg-white text-left hover:border-institutional-300"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt=""
              className="h-32 w-full object-cover transition group-hover:opacity-90"
            />
            <span className="px-2 py-1 text-[11px] font-medium text-gray-700">
              {TYPE_LABEL[p.type] ?? p.type}
            </span>
          </button>
        ))}
      </div>

      {opened && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenId(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={opened.url}
            alt=""
            className="max-h-[90vh] max-w-full rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
