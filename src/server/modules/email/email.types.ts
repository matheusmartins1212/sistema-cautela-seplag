import type { EmailTemplate } from "@prisma/client";

/** Mensagem de e-mail já renderizada, pronta para envio. */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string; // fallback em texto puro (obrigatório)
  template: EmailTemplate;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}

export interface EmailSendResult {
  providerMessageId: string;
}

/**
 * Contrato de provedor de e-mail. Implementações: console (dev) e SMTP.
 * Trocar o provedor NÃO deve exigir alteração nas regras de negócio.
 */
export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}
