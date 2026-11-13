import { isProduction } from "@/server/config/env";

/**
 * Logger estruturado mínimo com REDAÇÃO de chaves sensíveis.
 *
 * Nunca registra senha, hash, token, cookie, connection string ou CPF completo.
 * Mesmo que um campo sensível seja passado por engano, ele é redigido aqui como
 * defesa em profundidade. Em produção, emite JSON (amigável a coletores de log).
 */
const SENSITIVE_KEY_PATTERN =
  /(password|senha|token|secret|authorization|cookie|hash|cpf|database_url|session_secret)/i;

type LogLevel = "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

function redact(context: LogContext): LogContext {
  const out: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      out[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = redact(value as LogContext);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function emit(level: LogLevel, message: string, context?: LogContext) {
  const safe = context ? redact(context) : undefined;
  if (isProduction) {
    const payload = JSON.stringify({
      level,
      message,
      ...safe,
      ts: new Date().toISOString(),
    });
    console[level](payload);
  } else {
    console[level](`[${level}] ${message}`, safe ?? "");
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context),
};
