import { timingSafeEqual } from "node:crypto";
import { handleRoute, jsonOk } from "@/server/lib/http";
import { env } from "@/server/config/env";
import { Errors } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { runScheduledJobs } from "@/server/modules/jobs/jobs.service";

export const runtime = "nodejs";

/** Comparação em tempo constante de dois segredos (evita timing attack). */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Aciona os jobs agendados. Protegida por `CRON_SECRET` via cabeçalho
 * `Authorization: Bearer <segredo>`. Se `CRON_SECRET` não estiver configurado,
 * a rota responde como inexistente (recurso desabilitado). Deve ser chamada por
 * um agendador externo (cron do host, Vercel Cron, GitHub Actions, etc.).
 * Aceita GET porque é assim que o Vercel Cron chama (com o mesmo cabeçalho).
 */
const runJobs = handleRoute(async (req) => {
  const expected = env.CRON_SECRET;
  if (!expected) {
    // Rota desabilitada: não revela sua existência.
    throw Errors.notFound();
  }

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !secretMatches(token, expected)) {
    throw Errors.unauthorized();
  }

  const result = await runScheduledJobs();
  logger.info("Jobs agendados executados", {
    overdueCautions: result.overdueCautions,
    cleanupSessions: result.cleanup.sessions,
  });
  return jsonOk(result);
});

export const POST = runJobs;
export const GET = runJobs;
