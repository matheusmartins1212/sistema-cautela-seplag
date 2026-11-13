import { env } from "@/server/config/env";

/**
 * Rate limiting por janela fixa, chaveado por ação + identificador
 * (ex.: "login:ip:1.2.3.4" ou "login:email:hash").
 *
 * Implementação in-memory: adequada para desenvolvimento e instância única.
 * A interface `RateLimitStore` permite trocar por Redis/Upstash em produção
 * (múltiplas instâncias) SEM alterar os chamadores.
 *
 * IMPORTANTE: o limiter nunca recebe segredos. Para identificar por e-mail,
 * passe um hash/normalização — nunca a senha.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface Counter {
  count: number;
  resetAt: number; // epoch ms
}

interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<Counter>;
}

class InMemoryRateLimitStore implements RateLimitStore {
  private readonly counters = new Map<string, Counter>();

  async hit(key: string, windowMs: number): Promise<Counter> {
    const now = Date.now();
    const existing = this.counters.get(key);
    if (!existing || existing.resetAt <= now) {
      const fresh: Counter = { count: 1, resetAt: now + windowMs };
      this.counters.set(key, fresh);
      this.sweep(now);
      return fresh;
    }
    existing.count += 1;
    return existing;
  }

  // Limpeza oportunista de contadores expirados para não vazar memória.
  private sweep(now: number) {
    if (this.counters.size < 5_000) return;
    for (const [key, counter] of this.counters) {
      if (counter.resetAt <= now) this.counters.delete(key);
    }
  }
}

const store: RateLimitStore = new InMemoryRateLimitStore();

export interface RateLimitOptions {
  /** Máximo de tentativas na janela. Padrão: env.RATE_LIMIT_MAX_ATTEMPTS. */
  max?: number;
  /** Janela em segundos. Padrão: env.RATE_LIMIT_WINDOW_SECONDS. */
  windowSeconds?: number;
}

export async function rateLimit(
  key: string,
  options: RateLimitOptions = {},
): Promise<RateLimitResult> {
  const max = options.max ?? env.RATE_LIMIT_MAX_ATTEMPTS;
  const windowMs = (options.windowSeconds ?? env.RATE_LIMIT_WINDOW_SECONDS) * 1_000;

  const counter = await store.hit(key, windowMs);
  const remaining = Math.max(0, max - counter.count);
  const allowed = counter.count <= max;
  const retryAfterSeconds = allowed ? 0 : Math.ceil((counter.resetAt - Date.now()) / 1_000);

  return { allowed, remaining, retryAfterSeconds };
}
