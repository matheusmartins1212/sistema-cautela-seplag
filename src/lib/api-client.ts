/**
 * Cliente HTTP do frontend para a API interna. Padroniza o envelope de resposta
 * { ok, data } | { ok:false, error }. Não armazena tokens (a sessão é via cookie
 * HttpOnly gerenciado pelo servidor).
 */
export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<ApiResult<T>> {
  return request<T>(path, "POST", body);
}

export async function apiPatch<T = unknown>(path: string, body?: unknown): Promise<ApiResult<T>> {
  return request<T>(path, "PATCH", body);
}

export async function apiDelete<T = unknown>(path: string): Promise<ApiResult<T>> {
  return request<T>(path, "DELETE");
}

export async function apiGet<T = unknown>(path: string): Promise<ApiResult<T>> {
  return request<T>(path, "GET");
}

async function request<T>(path: string, method: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
    });
    const json = await res.json().catch(() => null);
    if (json && typeof json === "object" && "ok" in json) {
      return json as ApiResult<T>;
    }
    return {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Resposta inesperada do servidor." },
    };
  } catch {
    return {
      ok: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Falha de conexão. Verifique sua rede e tente novamente.",
      },
    };
  }
}
