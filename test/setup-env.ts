/**
 * Setup de ambiente para os testes. Define valores dummy (NÃO são segredos
 * reais) para que `src/server/config/env.ts` carregue sem erro durante os
 * testes. Nenhum valor real de produção é usado aqui.
 */
// NODE_ENV já é definido como "test" pelo Vitest.
process.env.APP_BASE_URL ??= "http://localhost:3000";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test?schema=public";
process.env.SESSION_SECRET ??= "test-session-secret-com-mais-de-32-caracteres-xx";
process.env.EMAIL_TOKEN_SECRET ??= "test-email-token-secret-com-mais-de-32-caracteres";
process.env.ALLOWED_EMAIL_DOMAIN ??= "seplag.mt.gov.br";
process.env.EMAIL_PROVIDER ??= "console";
process.env.EMAIL_CONFIRMATION_TOKEN_EXPIRES_IN ??= "24h";
process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN ??= "30m";
