# Sistema de Cautela de Veículos — SEPLAG-MT

Plataforma institucional para controle completo de **cautela e agendamento de veículos oficiais** da Secretaria de Estado de Planejamento e Gestão de Mato Grosso (SEPLAG-MT). Substitui o fluxo anterior baseado em Google Forms, planilhas e sistema de agendamento, centralizando cadastro, solicitação, aprovação, checklists de retirada/devolução, fotos, avarias, histórico, auditoria e notificações em uma única plataforma segura e auditável.

> ⚠️ Sistema interno de uso restrito e auditado. Trate dados pessoais e funcionais (CPF, matrícula, telefone) com rigor.

> 🚀 **Para colocar em produção**, siga o **[Guia de Go-Live](docs/GO-LIVE.md)** — variáveis de ambiente, banco, e-mail, jobs agendados, segurança e verificação pós-deploy.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | **Next.js 15** (App Router) — full-stack |
| Linguagem | **TypeScript** (modo estrito) |
| UI | **React 19** + **Tailwind CSS** (design tokens institucionais) |
| Banco | **PostgreSQL** (nuvem: Neon/Supabase) |
| ORM | **Prisma** (migrations versionadas, constraints reais) |
| Validação | **Zod** (env + schemas de entrada) |
| Senhas | **Argon2id** |
| Testes | **Vitest** |

### Arquitetura em camadas

Regras críticas vivem **sempre no backend**. A separação de responsabilidades segue:

```
src/
├─ app/                  # Next.js App Router — rotas, páginas e route handlers (HTTP)
├─ server/               # Backend: regras de negócio (nunca importado pelo client)
│  ├─ config/env.ts      # Validação centralizada de variáveis de ambiente (Zod)
│  ├─ db/prisma.ts       # Cliente Prisma singleton
│  ├─ lib/               # Utilidades de servidor (ex.: geração de código público)
│  └─ modules/           # (Fases seguintes) auth, users, vehicles, requests,
│                        #  cautions, checklists, audit, email, notifications
├─ shared/               # Código puro reutilizável no client e no server
│  └─ validation/        # CPF, domínio de e-mail institucional (com testes)
└─ components/           # (Fases seguintes) design system institucional
prisma/
├─ schema.prisma         # Fonte única do modelo de dados (12 models + enums)
└─ seed.ts               # Seed idempotente (catálogos + super admin via env)
```

---

## Pré-requisitos

- **Node.js >= 20** (testado em v24)
- Uma instância **PostgreSQL** acessível (recomendado: Neon ou Supabase, free tier)

---

## Configuração e execução

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` e preencha **obrigatoriamente**:

- `DATABASE_URL` — connection string do PostgreSQL (com `sslmode=require` na nuvem).
- `SESSION_SECRET` e `EMAIL_TOKEN_SECRET` — segredos aleatórios de 32+ bytes.
  Gere com: `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`
- `SUPER_ADMIN_*` — credenciais do super administrador inicial (criado pelo seed).

> O sistema **falha de forma controlada na inicialização** se uma configuração obrigatória estiver ausente ou inválida (ver `src/server/config/env.ts`).

### 3. Criar o schema no banco (migrations)

```bash
npm run prisma:migrate   # cria/aplica migrations em desenvolvimento
```

### 4. Popular dados iniciais (seed)

```bash
npm run db:seed
```

Cria: motivos de cautela, lotações/setores, locais de estacionamento, templates de itens de checklist e o **super administrador** (a partir das variáveis `SUPER_ADMIN_*`).

### 5. Rodar em desenvolvimento

```bash
npm run dev          # http://localhost:3000
```

---

## Scripts

| Script | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm run start` | Build e execução de produção |
| `npm run typecheck` | Checagem de tipos (tsc) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (write) |
| `npm test` | Testes unitários (Vitest) |
| `npm run prisma:migrate` | Aplica migrations (dev) |
| `npm run prisma:deploy` | Aplica migrations (produção) |
| `npm run prisma:studio` | UI de inspeção do banco |
| `npm run db:seed` | Executa o seed |

---

## Segurança (princípios aplicados desde a base)

- Senhas com **Argon2id**; nunca em texto puro, nunca em logs.
- Cadastro restrito ao domínio institucional `@seplag.mt.gov.br`, com proteção contra spoofing (subdomínio falso, duplo `@`, caracteres invisíveis) — ver `src/shared/validation/email-domain.ts`.
- Tokens (sessão, confirmação de e-mail, reset) são **armazenados como hash**; o token cru nunca é persistido.
- Variáveis de ambiente validadas; **segredos jamais versionados** (`.env` no `.gitignore`, `.env.example` sem valores reais).
- Cabeçalhos de segurança HTTP em todas as rotas (`next.config.ts`).
- Códigos públicos de solicitação/cautela com sufixo aleatório para **evitar enumeração** (IDOR).
- Auditoria (`AuditLog`) e logs de e-mail (`EmailLog`) desacoplados, modelados no schema.

---

## Roadmap por fases

- [x] **Fase 1 — Base técnica** *(concluída)*: scaffold, TypeScript, Prisma + schema completo, env validado, seed, testes, lint/format, design tokens.
- [x] **Fase 2 — Segurança & Autenticação** *(concluída)*: cadastro com domínio institucional, confirmação de e-mail, reenvio, login/logout, sessões HttpOnly, Argon2id, reset de senha, RBAC, guards, rate limit, auditoria, módulo de e-mail (console/SMTP). Ver [`docs/DECISOES-FASE-2.md`](./docs/DECISOES-FASE-2.md).
- [x] **Fase 3 — Veículos**: CRUD admin, status, histórico.
- [x] **Fase 4 — Solicitações**: tela do usuário, painel admin, aprovação/recusa, e-mails.
- [x] **Fase 5 — Cautelas**: criação automática na aprovação, status, históricos.
- [x] **Fase 6 — Checklists**: retirada/devolução, fotos, comparação automática, alertas.
- [x] **Fase 7 — Painel administrativo**: dashboard, calendário, relatórios.
- [x] **Fase 8 — Auditoria & hardening**: testes de segurança, observabilidade, docs finais.

