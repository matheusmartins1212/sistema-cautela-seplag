import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { AppError, Errors } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { rateLimit, type RateLimitOptions } from "@/server/lib/rate-limit";

/** Resposta de sucesso padronizada. */
export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status });
}

/** Converte um erro em resposta JSON SEGURA (sem stack trace/detalhe interno). */
function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          fieldErrors: error.fieldErrors,
        },
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "_";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    const appError = Errors.validation("Dados inválidos.", fieldErrors);
    return toErrorResponse(appError);
  }

  // Erro inesperado: loga internamente (sem expor) e responde genérico.
  logger.error("Erro não tratado em rota", {
    error: error instanceof Error ? error.message : "unknown",
  });
  return toErrorResponse(Errors.internal());
}

/**
 * Envolve um handler de rota com tratamento central de erros. Toda rota de API
 * deve usar este wrapper. O segundo argumento (`context`) é repassado para o
 * handler — em rotas dinâmicas, o Next.js entrega aqui o objeto com `params`.
 */
export function handleRoute<C = unknown>(
  fn: (req: Request, context: C) => Promise<NextResponse>,
): (req: Request, context: C) => Promise<NextResponse> {
  return async (req: Request, context: C) => {
    try {
      return await fn(req, context);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

/** Faz parse e validação do corpo JSON com um schema Zod (lança ZodError). */
export async function parseJsonBody<S extends ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw Errors.validation("Corpo da requisição inválido (JSON malformado).");
  }
  return schema.parse(raw);
}

/** Aplica rate limit e lança RATE_LIMITED se excedido. */
export async function enforceRateLimit(key: string, options?: RateLimitOptions): Promise<void> {
  const result = await rateLimit(key, options);
  if (!result.allowed) {
    throw Errors.rateLimited(`Muitas tentativas. Tente novamente em ${result.retryAfterSeconds}s.`);
  }
}
