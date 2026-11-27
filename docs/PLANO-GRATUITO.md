# Operação no plano gratuito (Vercel Hobby + Supabase Free)

Ajustes feitos em 27/11/2026 para o sistema funcionar com segurança sem planos pagos, e os passos que dependem de acesso às contas.

## O que o plano gratuito limita

| Limite | Efeito no sistema | Como foi tratado |
| --- | --- | --- |
| Vercel aceita no máximo 4,5 MB por requisição | Fotos de celular maiores eram recusadas | O navegador reduz cada foto para 1280 px e JPEG antes de enviar (cerca de 200 KB). O servidor aceita no máximo 4 MB e confere os bytes do arquivo |
| Supabase gratuito tem 1 GB de armazenamento de arquivos | Com dez fotos por viagem, cabem por volta de 500 viagens | Fotos reduzidas. Quando chegar perto do limite, decidir um prazo de guarda das fotos (por exemplo, 12 meses após o encerramento) |
| Supabase gratuito não faz backup | Perda total se algo der errado no banco | Backup diário criptografado pelo GitHub Actions (abaixo) |
| Supabase gratuito pausa o projeto após 7 dias sem uso | Sistema fora do ar até reativar no painel | A rotina diária da Vercel (05:00) e o backup diário (03:30) acessam o banco todo dia |
| Vercel Hobby guarda logs por 1 hora | Difícil investigar erros passados | O histórico de ações fica no banco. Para alertas, um serviço gratuito como o Sentry pode ser ligado depois |
| Vercel Hobby: termos de uso pessoal ou não comercial | Não é tecnicamente um limite, mas um ponto de conformidade | Levar para conta institucional antes do uso oficial |

## 1. Fotos no Supabase Storage

Hoje as fotos ficam no disco temporário da Vercel e se perdem. Para corrigir:

1. No painel do Supabase, abra **Project Settings > API Keys** e copie a chave **secret** (ou `service_role`). Não cole essa chave em conversas, e-mails ou no GitHub.
2. Na Vercel, em **Settings > Environment Variables**, crie `SUPABASE_SERVICE_ROLE_KEY` com essa chave, marcada como **Sensitive**, para Production.
3. Ainda na Vercel, mude `STORAGE_DRIVER` de `local` para `supabase` e publique de novo (Redeploy).

O bucket privado `checklist-photos` é criado sozinho no primeiro envio, só para imagens e com teto de 4 MB por arquivo. As fotos continuam saindo apenas pela rota autenticada do sistema.

Atenção: trocar `STORAGE_DRIVER` para `supabase` sem a chave impede o sistema de iniciar. Faça o passo 2 antes do 3.

## 2. Backup diário criptografado

O workflow `.github/workflows/backup-banco.yml` exporta o banco todo dia às 03:30 de Cuiabá, criptografa com AES-256 e guarda o arquivo por 30 dias na aba **Actions** do GitHub. O repositório é público, por isso o arquivo só abre com a senha.

Configuração (GitHub > Settings > Secrets and variables > Actions > New repository secret):

- `BACKUP_DATABASE_URL`: a conexão do Supabase na porta 5432 (Connect > "Session pooler" ou "Direct connection"). Pode ser a mesma usada pela Vercel em `DATABASE_URL`, se ela for de porta 5432.
- `BACKUP_PASSPHRASE`: uma senha longa (20 caracteres ou mais) que fique guardada fora do GitHub, por exemplo num cofre de senhas. Sem ela, os backups não abrem.

Depois de cadastrar, rode uma vez à mão em **Actions > Backup do banco > Run workflow** e confira se terminou com sucesso.

O GitHub desliga agendamentos de repositórios públicos depois de 60 dias sem nenhum commit. Se o projeto ficar parado esse tempo, reative o workflow na aba Actions.

### Restaurar

```bash
# 1. Baixe o artefato na aba Actions e descompacte o .zip
# 2. Descriptografe (pede a BACKUP_PASSPHRASE)
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in cautela-AAAA-MM-DD.dump.enc -out banco.dump

# 3. Restaure num banco vazio (de preferência um projeto novo, para conferir antes)
docker run --rm -i -e DB_URL="postgresql://..." -v "$PWD:/b" postgres:17 \
  sh -c 'pg_restore --no-owner --no-privileges --clean --if-exists -d "$DB_URL" /b/banco.dump'
```

O backup cobre o banco. As fotos do Storage não entram nele.

## 3. Fechar o banco para acesso direto

O Supabase expõe as tabelas do esquema `public` pela Data API para quem tiver a chave pública do projeto. O sistema não usa essa API, então o acesso pode ser retirado. No **SQL Editor** do Supabase, rode:

```sql
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
```

O sistema não é afetado: ele conecta com o próprio usuário do banco, não com `anon` nem `authenticated`.

Também no painel:

- **Database > Settings > SSL Configuration**: ligar "Enforce SSL on incoming connections". O banco reinicia em poucos segundos.
- **Advisors > Security Advisor**: conferir se sobrou algum alerta.

## 4. Senha do super administrador

O perfil agora tem "Alterar minha senha". Depois de trocar a senha do administrador por lá, apague a variável `SUPER_ADMIN_PASSWORD` na Vercel: ela só serve para a carga inicial do banco.
