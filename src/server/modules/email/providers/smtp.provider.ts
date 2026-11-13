import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/server/config/env";
import type {
  EmailMessage,
  EmailProvider,
  EmailSendResult,
} from "@/server/modules/email/email.types";

/**
 * Provedor SMTP real (institucional/Microsoft 365/SES/etc.) via nodemailer.
 * Ativado por EMAIL_PROVIDER=smtp + variáveis SMTP_*. As credenciais vêm
 * exclusivamente de variáveis de ambiente (nunca hardcoded).
 */
export class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp";
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;
    if (!env.SMTP_HOST || !env.SMTP_PORT) {
      throw new Error("SMTP não configurado: defina SMTP_HOST e SMTP_PORT no ambiente.");
    }
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
      auth:
        env.SMTP_USER && env.SMTP_PASSWORD
          ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
          : undefined,
    });
    return this.transporter;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const info = await this.getTransporter().sendMail({
      from: `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return { providerMessageId: info.messageId };
  }
}
