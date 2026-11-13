import { randomUUID } from "node:crypto";
import { logger } from "@/server/lib/logger";
import type {
  EmailMessage,
  EmailProvider,
  EmailSendResult,
} from "@/server/modules/email/email.types";

/**
 * Provedor de e-mail para desenvolvimento.
 *
 * NÃO envia e-mail e, por política de segurança, NÃO imprime o corpo, o link
 * nem o token — apenas metadados não sensíveis (destinatário, assunto,
 * template). A validação dos fluxos de confirmação/reset em dev é feita pelos
 * testes de integração (que capturam o token via provedor de teste) ou por
 * inspeção direta do banco. Em produção usa-se o provedor SMTP.
 */
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console";

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const providerMessageId = `console-${randomUUID()}`;
    logger.info("E-mail (console provider) — não enviado, apenas registrado", {
      to: message.to,
      subject: message.subject,
      template: message.template,
      providerMessageId,
    });
    return { providerMessageId };
  }
}
