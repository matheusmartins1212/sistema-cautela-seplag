import { prisma } from "@/server/db/prisma";
import { logger } from "@/server/lib/logger";
import { getEmailProvider } from "@/server/modules/email/provider-factory";
import type { EmailMessage } from "@/server/modules/email/email.types";

const MAX_ATTEMPTS = 3;

/**
 * Envio transacional centralizado.
 *
 * Fluxo: cria EmailLog PENDING → tenta enviar (com retry em falha temporária)
 * → atualiza para SENT/FAILED. NUNCA persiste o corpo do e-mail, o link ou o
 * token — apenas metadados (destinatário, assunto, template, status, id do
 * provedor, mensagem de erro). Falha de e-mail não lança para o chamador por
 * padrão (não deve derrubar o cadastro), mas é registrada.
 */
export async function sendTransactionalEmail(
  message: EmailMessage,
): Promise<{ ok: boolean; emailLogId: string }> {
  const provider = getEmailProvider();

  const log = await prisma.emailLog.create({
    data: {
      to: message.to,
      subject: message.subject,
      template: message.template,
      status: "PENDING",
      provider: provider.name,
      relatedEntityType: message.relatedEntityType ?? null,
      relatedEntityId: message.relatedEntityId ?? null,
    },
  });

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await provider.send(message);
      await prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: "SENT",
          providerMessageId: result.providerMessageId,
          attempts: attempt,
        },
      });
      return { ok: true, emailLogId: log.id };
    } catch (error) {
      lastError = error;
      await prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: attempt < MAX_ATTEMPTS ? "RETRYING" : "FAILED",
          attempts: attempt,
          // Mensagem de erro do provedor (sem corpo/token).
          errorMessage: error instanceof Error ? error.message.slice(0, 500) : "unknown",
        },
      });
    }
  }

  logger.error("Falha ao enviar e-mail após múltiplas tentativas", {
    template: message.template,
    emailLogId: log.id,
    error: lastError instanceof Error ? lastError.message : "unknown",
  });
  return { ok: false, emailLogId: log.id };
}
