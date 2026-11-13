import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { handleRoute } from "@/server/lib/http";
import { requireUser } from "@/server/modules/auth/guards";
import { loadPhotoForActor } from "@/server/modules/checklists/checklist-photo.service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = handleRoute<RouteContext>(async (_req, { params }) => {
  const actor = await requireUser();
  const { id } = await params;
  const { meta, stream } = await loadPhotoForActor(id, actor);

  // Conversão de Node Readable em web ReadableStream para o Response do Next.
  const webStream = Readable.toWeb(stream as Readable) as ReadableStream;
  return new NextResponse(webStream, {
    headers: {
      "content-type": meta.mimeType,
      "content-length": String(meta.size),
      "cache-control": "private, max-age=300",
    },
  });
});
