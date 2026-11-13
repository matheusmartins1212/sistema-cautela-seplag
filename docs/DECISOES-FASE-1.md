# Fase 1 — Base técnica · Registro de decisões

Documento de rastreabilidade das decisões arquiteturais tomadas na fundação do sistema. Atualizado em 2026-06-09.

## Decisões aprovadas

| # | Decisão | Justificativa |
|---|---|---|
| 1 | **Next.js 15 full-stack** (App Router) em vez de NestJS + frontend separado | A especificação aceita ambas; o requisito de UI é extenso. Um único código (front + back) reduz overhead de 2 apps/CORS/deploy, mantendo separação de responsabilidades via camada `src/server`. Aprovado pelo usuário. |
| 2 | **PostgreSQL em nuvem** (Neon/Supabase) | Não há Postgres nem Docker na máquina. Nuvem é production-like, sem instalação local. Conexão via `DATABASE_URL`. Aprovado pelo usuário. |
| 3 | **Prisma** como ORM | Mais maduro para este caso; migrations versionadas, constraints reais, geração de tipos. (Drizzle era a alternativa da spec.) |
| 4 | **Argon2id** para hash de senha | Recomendação primária da spec (seção 4); resistente a GPU/ASIC. |
| 5 | **Sessões server-side** com token opaco | Cookie HttpOnly guardará apenas o id de sessão; `Session.tokenHash` armazena o hash, nunca o token cru. Evita exposição em localStorage e replay. |
| 6 | **Catálogos gerenciáveis + valor textual no registro** | Motivos, lotações e locais ficam em tabelas (`CautionReason`, `OrganizationalUnit`, `ParkingLocation`) para alimentar dropdowns e o seed, mas os registros (ex.: `VehicleRequest.reason`) guardam o texto escolhido. Preserva histórico e suporta a opção "Outro". |
| 7 | **Itens de checklist via template** (`ChecklistItemTemplate`) | Permite adicionar/editar itens sem alterar código (seção 17/37). Instanciados em `ChecklistItem` por cautela, com `itemKey` único por categoria. |
| 8 | **Checklists distinguidos por `type`** (RETIRADA/DEVOLUCAO) | Em vez de FKs `withdrawalChecklistId`/`returnChecklistId` em `Caution` (que criariam relações circulares no Prisma), há constraint `@@unique([cautionId, type])`. Mais simples e íntegro; mesma garantia funcional. |
| 9 | **Validação de ambiente centralizada** (`env.ts` com Zod) | Falha controlada na inicialização se faltar config. Proíbe uso direto de `process.env` no resto do servidor. |
| 10 | **Código público com sufixo aleatório** (`SOL-/CTL-AAAA-MM-DD-XXXXXXXX`) | Evita enumeração sequencial (IDOR), conforme seção 15. Unicidade final garantida por constraint UNIQUE. |

## Arquivos criados nesta fase

### Configuração de projeto
- `package.json` — dependências, scripts, config do seed Prisma.
- `tsconfig.json` — TypeScript estrito (`noUncheckedIndexedAccess`, etc.) + alias `@/*`.
- `next.config.ts` — cabeçalhos de segurança HTTP, `poweredByHeader: false`.
- `tailwind.config.ts` — paleta institucional (azul institucional + status semânticos).
- `postcss.config.mjs`, `eslint.config.mjs`, `.prettierrc.json` — toolchain.
- `.gitignore`, `.env.example` — higiene de segredos.
- `vitest.config.ts` — testes com alias `@`.

### Modelo de dados
- `prisma/schema.prisma` — 16 models (User, Session, tokens, Vehicle, VehicleRequest, Caution, Checklist, ChecklistItem, ChecklistPhoto, DamageReport, AuditLog, EmailLog, Notification + 4 catálogos) e ~20 enums.
- `prisma/seed.ts` — seed idempotente (catálogos + super admin via env, Argon2id).

### Camada de servidor
- `src/server/config/env.ts` — validação de ambiente.
- `src/server/db/prisma.ts` — cliente singleton.
- `src/server/lib/public-code.ts` (+ teste) — geração de código público.

### Código compartilhado (puro, testado)
- `src/shared/validation/cpf.ts` (+ teste) — normalização, validação de dígitos, máscara.
- `src/shared/validation/email-domain.ts` (+ teste) — normalização e validação anti-spoofing do domínio institucional.

### Shell da aplicação
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`.

### Documentação
- `README.md`, `docs/DECISOES-FASE-1.md` (este arquivo).

## Verificações executadas (todas ✅)

- `prisma generate` — schema válido, client gerado.
- `vitest run` — **23 testes** passando (CPF, domínio de e-mail anti-spoofing, código público).
- `tsc --noEmit` — sem erros de tipo.
- `next lint` — sem avisos/erros.
- `next build` — build de produção bem-sucedido.

## Validação end-to-end com Supabase (2026-06-09)

A conexão com o **PostgreSQL hospedado no Supabase** foi configurada pelo usuário (segredos preenchidos manualmente no `.env`, fora do controle de versão) e **validada com sucesso de ponta a ponta**. Nenhum segredo (connection string, `SESSION_SECRET`, `EMAIL_TOKEN_SECRET`, credenciais do super admin) é exibido, registrado ou versionado.

Resultado da validação:

| Etapa | Comando | Resultado |
|---|---|---|
| Geração do client | `npx prisma generate` | ✅ |
| Migration inicial | `npm run prisma:migrate` (`init`) | ✅ migration `…_init` criada e aplicada |
| Seed | `npm run db:seed` | ✅ idempotente |
| Testes | `npm run test` | ✅ 23 testes |
| Tipos | `npm run typecheck` | ✅ |
| Lint | `npm run lint` | ✅ |
| Build | `npm run build` | ✅ |

**Conferência do banco (apenas metadados):**
- **19 tabelas** criadas no schema `public` (18 do domínio + `_prisma_migrations`).
- Seed aplicado: **12** motivos de cautela, **20** lotações/setores, **6** locais de estacionamento, **41** templates de itens de checklist, **1** super administrador.

A migration versionada vive em `prisma/migrations/` e deve ser aplicada em produção com `npm run prisma:deploy`.

## Estado

Fase 1 **concluída e validada**. Aguardando autorização para iniciar a Fase 2 (Segurança & Autenticação).
