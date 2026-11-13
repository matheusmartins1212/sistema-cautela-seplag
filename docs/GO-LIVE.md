# Guia de Go-Live — Sistema de Cautela de Veículos (SEPLAG-MT)

Este guia reúne **tudo que a equipe de TI precisa configurar** para colocar o
sistema no ar com segurança. É a etapa final prevista no plano (Fase 8 —
documentação/produção). Linguagem direta: siga os passos na ordem.

> **Resumo:** o desenvolvimento está completo e testado. O que falta para o
> "no ar" é **configuração de ambiente** (banco, e-mail, segredos, HTTPS,
> agendador) — descrita abaixo.

---

## 1. Pré-requisitos

- **Node.js 20+** no servidor.
- **PostgreSQL** acessível (já usamos o Supabase em nuvem; pode ser o banco
  institucional). A connection string vai em `DATABASE_URL`.
- Um **servidor de e-mail (SMTP)** institucional para envio real (Microsoft 365
  / Exchange da SEPLAG, ou um provedor autorizado).
- **HTTPS obrigatório** em produção (certificado válido no domínio público).

---

## 2. Variáveis de ambiente (`.env`)

Crie um arquivo `.env` no servidor (NUNCA versionar). Use o `.env.example` como
modelo. O sistema **falha de propósito ao iniciar** se faltar algo obrigatório.

### Obrigatórias (sem elas o sistema não sobe)

| Variável | O que é |
|---|---|
| `APP_BASE_URL` | URL pública com `https://` (ex.: `https://cautela.seplag.mt.gov.br`). Usada nos links de e-mail. Sem barra no final. |
| `DATABASE_URL` | Conexão do PostgreSQL (com `sslmode=require` em nuvem). |
| `SESSION_SECRET` | Segredo aleatório de 32+ caracteres. Gere com `openssl rand -base64 48`. |
| `EMAIL_TOKEN_SECRET` | Outro segredo aleatório de 32+ caracteres, **diferente** do de sessão. |

### Importantes para produção

| Variável | Valor recomendado |
|---|---|
| `NODE_ENV` | `production` (ativa cookie Secure e logs JSON). |
| `EMAIL_PROVIDER` | `smtp` (em produção; `console` só loga, não envia). |
| `SMTP_HOST`, `SMTP_PORT` | Servidor SMTP institucional (obrigatórios se `EMAIL_PROVIDER=smtp`). |
| `SMTP_SECURE` | `true` para porta 465; `false` para 587 (STARTTLS). |
| `SMTP_USER`, `SMTP_PASSWORD` | Credenciais do remetente. |
| `EMAIL_FROM_ADDRESS` | Ex.: `nao-responda@seplag.mt.gov.br`. |
| `ALLOWED_EMAIL_DOMAIN` | `seplag.mt.gov.br` (domínio que pode se cadastrar). |
| `CRON_SECRET` | Segredo de 32+ chars para habilitar os jobs agendados (ver seção 5). |

### Com valores padrão (ajuste se quiser)

`SESSION_TTL_SECONDS` (8h), `EMAIL_CONFIRMATION_TOKEN_EXPIRES_IN` (24h),
`PASSWORD_RESET_TOKEN_EXPIRES_IN` (30m), `UPLOAD_MAX_BYTES` (8 MB),
`RATE_LIMIT_WINDOW_SECONDS` (900), `RATE_LIMIT_MAX_ATTEMPTS` (5),
`STORAGE_DRIVER` (`local`).

### Super administrador inicial (criado pelo seed)

`SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `SUPER_ADMIN_NAME`,
`SUPER_ADMIN_CPF`, `SUPER_ADMIN_REGISTRATION`. **Nunca** versionar a senha.

---

## 3. Banco de dados

Na primeira implantação, no servidor (com o `.env` pronto):

```bash
npm ci                  # instala dependências
npm run prisma:deploy   # aplica as migrations no banco (produção)
npm run db:seed         # cria super admin + catálogos (motivos, lotações, etc.)
```

Os veículos da frota são cadastrados pelo painel administrativo (Veículos → Novo).

---

## 4. E-mail

1. Defina `EMAIL_PROVIDER=smtp` e preencha as variáveis `SMTP_*`.
2. Teste enviando um cadastro real e confirmando o recebimento.
3. Todos os envios ficam registrados na tabela `email_logs` (status, falhas).

E-mails ativos: confirmação de cadastro, recuperação de senha, solicitação
recebida/aprovada/recusada, lembretes de retirada/devolução e alerta de atraso.

---

## 5. Jobs agendados (`/api/cron`)

Os jobs marcam cautelas atrasadas, enviam lembretes/alertas e limpam
sessões/tokens vencidos. Para habilitar:

1. Defina `CRON_SECRET` no `.env` (32+ caracteres).
2. Configure um **agendador externo** para chamar a rota a cada ~15 minutos:

```bash
curl -X POST -H "Authorization: Bearer SEU_CRON_SECRET" https://SEU_HOST/api/cron
```

Opções de agendador: cron do servidor (Linux), Agendador de Tarefas (Windows),
Vercel Cron, GitHub Actions agendado. Sem `CRON_SECRET`, a rota fica desligada.

---

## 6. Build e execução

```bash
npm run build   # compila a aplicação
npm run start   # inicia em produção (porta 3000 por padrão)
```

Recomenda-se rodar atrás de um proxy reverso (Nginx) com HTTPS, ou em uma
plataforma gerenciada (Vercel, Cloud Run). Garanta que o cabeçalho
`X-Forwarded-For` chegue à aplicação (usado em auditoria/rate limit).

---

## 7. Checklist de segurança (antes de liberar)

- [ ] `NODE_ENV=production` (cookies `Secure`).
- [ ] **HTTPS** ativo no domínio público.
- [ ] `SESSION_SECRET` e `EMAIL_TOKEN_SECRET` fortes e distintos.
- [ ] `.env` fora do versionamento; segredos só no servidor.
- [ ] Senha do super admin trocada após o primeiro acesso.
- [ ] `EMAIL_PROVIDER=smtp` (não `console`).
- [ ] `CRON_SECRET` definido e agendador ativo.

---

## 8. Verificação pós-deploy

1. Acesse `https://SEU_HOST/login` → deve carregar.
2. Cadastre-se com um e-mail `@seplag.mt.gov.br` → recebe e confirma o e-mail.
3. Faça login → cai no painel.
4. Crie uma solicitação; aprove como admin; confira o e-mail de aprovação.
5. Dispare o cron manualmente (seção 5) → resposta `200` com o resumo.

---

## 9. Escala futura e pendências operacionais

- **Múltiplas instâncias:** o rate limit é em memória por processo. Para rodar
  com mais de uma instância, trocar por Redis/Upstash (a interface
  `RateLimitStore` já permite isso sem mexer nas regras).
- **Fotos:** na Vercel o disco não persiste, então use `STORAGE_DRIVER=supabase`
  com `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e um bucket privado
  (`SUPABASE_STORAGE_BUCKET`, padrão `checklist-photos`). O driver `local` serve
  apenas para desenvolvimento ou servidor com disco próprio.

---

## 10. Comandos úteis (manutenção)

```bash
npm run test          # roda a suíte de testes
npm run typecheck     # checagem de tipos
npm run lint          # análise estática
npm run prisma:studio # interface visual do banco (uso administrativo)
```
