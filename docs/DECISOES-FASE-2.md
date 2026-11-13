# Fase 2 — Segurança & Autenticação · Registro de decisões

Implementação do sistema de autenticação próprio (sem Supabase Auth, sem serviço externo de e-mail). Atualizado em 2026-06-09.

## Escopo entregue

Cadastro · validação de domínio `@seplag.mt.gov.br` · confirmação de e-mail · reenvio controlado · login · logout · sessões HttpOnly · Argon2id · recuperação e reset de senha · RBAC (USER/ADMIN/SUPER_ADMIN) · guards · rate limiting · auditoria de eventos de autenticação · logs sem dados sensíveis · testes unitários e de integração.

## Decisões e justificativas

| # | Decisão | Justificativa |
|---|---|---|
| 1 | **Autenticação própria** (não Supabase Auth) | Requisito explícito. Controle total sobre regras institucionais, auditoria e RBAC. |
| 2 | **Sessão server-side com token opaco** | Cookie `cgv_session` HttpOnly/SameSite=Lax (Secure em produção) guarda apenas o token cru; o banco guarda só o `tokenHash` (SHA-256). Sem JWT no cliente, sem token em localStorage. Revalidação de usuário ativo a cada requisição protegida. |
| 3 | **Argon2id** com parâmetros acima do mínimo OWASP | Hash de senha resistente; nunca em texto puro/log. |
| 4 | **Tokens (confirmação/reset) como hash no banco** | Token cru de 256 bits entregue só por e-mail; armazenamos SHA-256. Uso único (`consumedAt`) e expiração. Novo token invalida os anteriores. |
| 5 | **Anti-enumeração** | `forgot-password` e `resend-confirmation` sempre respondem genérico. No cadastro, conflito de unicidade não revela o campo. No login, verificação de senha é executada mesmo sem usuário (mitiga timing) e o status só é revelado após senha correta. |
| 6 | **Camada HTTP central** (`handleRoute`) | Tratamento único de erros → respostas JSON seguras e genéricas, sem stack trace. `AppError` tipado com código + status + mensagem amigável. |
| 7 | **Rate limiting in-memory com interface trocável** | Janela fixa por ação+identificador (IP e/ou e-mail). Adequado a dev/instância única; a interface `RateLimitStore` permite Redis em produção sem alterar chamadores. |
| 8 | **Abstração de e-mail por provider** | `EmailProvider` com `ConsoleEmailProvider` (dev, padrão) e `SmtpEmailProvider` (nodemailer, real, ativado por `EMAIL_PROVIDER=smtp`). Trocar provedor não afeta regras de negócio. `EmailLog` registra metadados (nunca corpo/token); retry com limite. |
| 9 | **Provider console NÃO imprime token/link/corpo** | Apenas metadados (destinatário, assunto, template). Honra a regra de não imprimir tokens. Validação de fluxos em dev via testes de integração. |
| 10 | **Guards no backend como fonte de verdade** | `requireUser`/`requireRole`/`requireAdmin`. Middleware de borda apenas checa presença do cookie (não acessa banco) — primeira barreira, não autorização final. |
| 11 | **Constante do cookie isolada** (`session-cookie.ts`) | Permite o middleware (edge) importar sem puxar Prisma/Argon2 para o bundle de borda. |

## Arquivos criados

### Núcleo de segurança (`src/server/lib`)
- `password.ts` — Argon2id (hash/verify).
- `tokens.ts` — geração/hash (SHA-256) e comparação em tempo constante.
- `duration.ts` — parsing de durações ("24h"/"30m").
- `errors.ts` — `AppError` + fábricas com mensagens genéricas.
- `logger.ts` — logger com **redação** de chaves sensíveis.
- `request-context.ts` — extração de IP/User-Agent.
- `rate-limit.ts` — limiter in-memory + interface de store.
- `audit.ts` — gravação tolerante a falhas em `AuditLog`.
- `http.ts` — `handleRoute`, `parseJsonBody`, `enforceRateLimit`, `jsonOk`.

### Módulo de e-mail (`src/server/modules/email`)
- `email.types.ts`, `provider-factory.ts`, `email.service.ts`.
- `providers/console.provider.ts`, `providers/smtp.provider.ts`.
- `templates/layout.ts`, `templates/auth-templates.ts`.

### Módulo de autenticação (`src/server/modules/auth`)
- `auth.schemas.ts` — Zod (domínio, CPF, senha forte, confirmação).
- `auth.service.ts` — register, verifyEmail, resendConfirmation, login, logout, forgotPassword, resetPassword.
- `session.ts` + `session-cookie.ts` — sessões HttpOnly.
- `rbac.ts` — hierarquia de papéis.
- `guards.ts` — requireUser/requireRole/requireAdmin/requireSuperAdmin.

### Usuários (`src/server/modules/users`)
- `user.dto.ts` — `toPublicUser` (sem `passwordHash`, CPF mascarado).

### Rotas de API (`src/app/api/auth`)
- `register`, `verify-email`, `resend-confirmation`, `login`, `logout`, `forgot-password`, `reset-password`, `me`.

### UI (`src/app/(auth)`, `src/components`, `src/lib`)
- Páginas: `login`, `cadastro`, `verificar-email`, `recuperar-senha`, `redefinir-senha` + layout.
- Painel protegido: `src/app/painel/page.tsx` (Server Component) + `logout-button.tsx`.
- Componentes: `ui/button`, `ui/field`, `ui/alert`.
- `lib/api-client.ts`, `lib/cn.ts`.
- `src/middleware.ts` — proteção de `/painel`.
- `shared/validation/password.ts` — política de senha.

### Compartilhado entre validações puras (`src/shared/validation`)
- `password.ts` (política de senha forte).

## Testes (58 no total, 10 arquivos)

- **Unitários:** CPF, domínio de e-mail (anti-spoofing), política de senha, duração, tokens (hash/uso), RBAC, código público, templates de e-mail (estrutura + escape anti-injeção + fallback texto).
- **Validação (Zod):** `auth.schemas` — domínio institucional obrigatório, anti-spoofing, CPF inválido, senha fraca, confirmação divergente, normalização.
- **Integração de serviço (Prisma/sessão/e-mail/auditoria mockados):** `auth.service` — credenciais inválidas, anti-enumeração no login, conta não confirmada, sucesso cria sessão + auditoria; verifyEmail rejeita token inexistente/expirado/consumido; forgotPassword silencioso para e-mail inexistente.

## Comandos executados (todos ✅)

| Comando | Resultado |
|---|---|
| `npx prisma generate` | ✅ |
| `npm run test` | ✅ 58 testes |
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ |
| `npm run build` | ✅ (8 rotas API + 5 telas + painel + middleware) |

## Riscos / pendências

- **Rate limit in-memory**: zera a cada restart e não é compartilhado entre instâncias. Para produção multi-instância, implementar `RateLimitStore` com Redis.
- **E-mail em dev (console)**: não entrega links; por política, não imprime token. A verificação manual de ponta a ponta exige provedor SMTP em staging ou inspeção via testes.
- **Sem testes E2E com banco real**: a ausência de banco de testes dedicado levou a testes de integração no nível de serviço (Prisma mockado). Recomendado um Postgres de teste para E2E reais em fase de hardening.
- **CSRF**: mitigado por `SameSite=Lax` + APIs que exigem `Content-Type: application/json`. Tokens anti-CSRF explícitos podem ser adicionados no hardening (Fase 8).
- **Setor/Lotação no cadastro**: hoje campos de texto; integração com os catálogos (dropdowns) fica para quando o módulo administrativo for construído.

## Próximo passo recomendado

Iniciar a **Fase 3 — Veículos** (CRUD administrativo, status, histórico e importação/seed da planilha), reaproveitando guards (`requireAdmin`), auditoria e o padrão de rotas/erros já estabelecidos.
