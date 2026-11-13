/**
 * Extração segura de contexto da requisição (IP e User-Agent) a partir dos
 * cabeçalhos, para uso em auditoria e rate limiting. Nunca lança.
 */
export interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
}

export function getRequestContext(headers: Headers): RequestContext {
  // Em produção atrás de proxy/load balancer, o IP real vem em X-Forwarded-For.
  const forwarded = headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || null;

  const ua = headers.get("user-agent");
  return {
    ipAddress: ip,
    // Limita o tamanho do UA para evitar abuso de armazenamento.
    userAgent: ua ? ua.slice(0, 512) : null,
  };
}
