import { NextResponse } from "next/server";
import { handleRoute } from "@/server/lib/http";
import { getRequestContext } from "@/server/lib/request-context";
import { requireUser } from "@/server/modules/auth/guards";
import { deletePhoto } from "@/server/modules/checklists/checklist-photo.service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; photoId: string }> };

export const DELETE = handleRoute<RouteContext>(async (req, { params }) => {
  const context = getRequestContext(req.headers);
  const actor = await requireUser();
  const { photoId } = await params;
  await deletePhoto(photoId, actor, context);
  return NextResponse.json({ ok: true, data: null });
});
