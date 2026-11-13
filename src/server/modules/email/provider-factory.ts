import { env } from "@/server/config/env";
import type { EmailProvider } from "@/server/modules/email/email.types";
import { ConsoleEmailProvider } from "@/server/modules/email/providers/console.provider";
import { SmtpEmailProvider } from "@/server/modules/email/providers/smtp.provider";

let cached: EmailProvider | null = null;

/** Seleciona o provedor de e-mail conforme EMAIL_PROVIDER. */
export function getEmailProvider(): EmailProvider {
  if (cached) return cached;
  cached = env.EMAIL_PROVIDER === "smtp" ? new SmtpEmailProvider() : new ConsoleEmailProvider();
  return cached;
}

/** Permite injetar um provedor (usado em testes). */
export function setEmailProvider(provider: EmailProvider | null): void {
  cached = provider;
}
