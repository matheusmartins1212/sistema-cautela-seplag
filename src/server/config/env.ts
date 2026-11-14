import { z } from "zod";

/**
 * Validação centralizada das variáveis de ambiente.
 *
 * O sistema FALHA de forma controlada na inicialização se uma configuração
 * obrigatória estiver ausente ou inválida — nunca arranca com config incompleta.
 * Segredos jamais têm valor padrão inseguro embutido aqui.
 */
const booleanFromString = z.enum(["true", "false"]).transform((value) => value === "true");

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_BASE_URL: z.string().url(),

    DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),

    SESSION_SECRET: z.string().min(32, "SESSION_SECRET deve ter ao menos 32 caracteres"),
    SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(28800),

    EMAIL_TOKEN_SECRET: z.string().min(32, "EMAIL_TOKEN_SECRET deve ter ao menos 32 caracteres"),
    EMAIL_CONFIRMATION_TOKEN_EXPIRES_IN: z.string().default("24h"),
    PASSWORD_RESET_TOKEN_EXPIRES_IN: z.string().default("30m"),

    // Contato de suporte exibido no rodapé do login (ex.: "satgf@seplag.mt.gov.br · ramal 0000").
    SUPPORT_CONTACT: z.string().optional(),

    // Domínios aceitos no cadastro, separados por vírgula. Aceita curinga de
    // subdomínios para atender vários órgãos (ex.: "seplag.mt.gov.br,*.mt.gov.br").
    ALLOWED_EMAIL_DOMAIN: z.string().default("seplag.mt.gov.br"),

    SUPER_ADMIN_EMAIL: z.string().email().optional(),
    SUPER_ADMIN_PASSWORD: z.string().optional(),
    SUPER_ADMIN_NAME: z.string().optional(),
    SUPER_ADMIN_CPF: z.string().optional(),
    SUPER_ADMIN_REGISTRATION: z.string().optional(),

    EMAIL_PROVIDER: z.enum(["console", "smtp"]).default("console"),
    EMAIL_FROM_NAME: z.string().default("Central de Veículos Compartilhados - SEPLAG/SATGF"),
    EMAIL_FROM_ADDRESS: z.string().email().default("nao-responda@seplag.mt.gov.br"),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_SECURE: booleanFromString.optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    EMAIL_API_KEY: z.string().optional(),
    EMAIL_API_BASE_URL: z.string().optional(),

    STORAGE_DRIVER: z.enum(["local", "s3", "supabase"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().default("./storage/uploads"),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    // Supabase Storage (STORAGE_DRIVER=supabase). Chave secreta só no servidor.
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    SUPABASE_STORAGE_BUCKET: z.string().default("checklist-photos"),
    UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(8_388_608),

    RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(900),
    RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),

    // Segredo para acionar /api/cron (jobs agendados). Se ausente, a rota fica
    // desabilitada. Deve ter alta entropia (>= 32 chars).
    CRON_SECRET: z.string().min(32, "CRON_SECRET deve ter ao menos 32 caracteres").optional(),
  })
  .superRefine((env, ctx) => {
    if (env.EMAIL_PROVIDER === "smtp") {
      if (!env.SMTP_HOST || !env.SMTP_PORT) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "SMTP_HOST e SMTP_PORT são obrigatórios quando EMAIL_PROVIDER=smtp",
          path: ["SMTP_HOST"],
        });
      }
    }
    if (env.STORAGE_DRIVER === "supabase") {
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Storage Supabase requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY",
          path: ["STORAGE_DRIVER"],
        });
      }
    }
    if (env.STORAGE_DRIVER === "s3") {
      const missing = (
        [
          "S3_ENDPOINT",
          "S3_REGION",
          "S3_BUCKET",
          "S3_ACCESS_KEY_ID",
          "S3_SECRET_ACCESS_KEY",
        ] as const
      ).filter((key) => !env[key]);
      if (missing.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Storage S3 requer: ${missing.join(", ")}`,
          path: ["STORAGE_DRIVER"],
        });
      }
    }
  });

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(raiz)"}: ${issue.message}`)
      .join("\n");
    // Não logamos valores, apenas quais chaves falharam.
    throw new Error(`Configuração de ambiente inválida. Verifique seu .env:\n${details}`);
  }
  return parsed.data;
}

export type Env = z.infer<typeof envSchema>;

/**
 * Objeto de ambiente validado. Importe `env` em qualquer lugar do servidor.
 * NÃO use `process.env` diretamente fora deste arquivo.
 */
export const env = loadEnv();

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
