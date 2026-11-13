import { randomBytes, createHmac } from "node:crypto";
import { env } from "@/server/config/env";

/**
 * Geração e verificação de tokens opacos (sessão, confirmação de e-mail, reset).
 *
 * Modelo de segurança:
 *  - O token CRU (alta entropia) é gerado uma vez e entregue ao destinatário
 *    (cookie de sessão ou link de e-mail). NUNCA é persistido nem logado.
 *  - No banco guardamos apenas o HMAC-SHA-256 do token, chaveado por um segredo
 *    do servidor (`SESSION_SECRET` ou `EMAIL_TOKEN_SECRET`). A verificação
 *    recalcula o HMAC do token apresentado e compara com o valor armazenado.
 *  - O uso de HMAC (e não SHA-256 puro) garante que um vazamento somente-leitura
 *    do banco não permita forjar tokens válidos sem também conhecer o segredo,
 *    além de oferecer separação de domínio entre finalidades (`TokenPurpose`):
 *    o hash de um token de sessão jamais coincide com o de um token de e-mail.
 *  - Como o token tem entropia alta (256 bits), o HMAC-SHA-256 é adequado aqui
 *    (diferente de senhas, que exigem Argon2id por terem baixa entropia).
 */

const TOKEN_BYTES = 32; // 256 bits de entropia

/** Finalidade do token — define qual segredo chaveia o HMAC (domain separation). */
export type TokenPurpose = "session" | "email";

const KEY_BY_PURPOSE: Record<TokenPurpose, string> = {
  session: env.SESSION_SECRET,
  email: env.EMAIL_TOKEN_SECRET,
};

/** Gera um token cru url-safe (base64url). */
export function generateRawToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/**
 * HMAC-SHA-256 (hex) do token, chaveado pelo segredo da finalidade, para
 * armazenamento/lookup. Determinístico para a mesma finalidade e segredo.
 */
export function hashToken(rawToken: string, purpose: TokenPurpose): string {
  return createHmac("sha256", KEY_BY_PURPOSE[purpose]).update(rawToken).digest("hex");
}
