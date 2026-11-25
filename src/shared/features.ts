/**
 * Envio de e-mail pela plataforma. Desligado enquanto o setor não tiver as
 * credenciais de SMTP: o cadastro é liberado pela central, a recuperação de
 * senha é feita pela central e os avisos chegam só pela plataforma.
 *
 * Para religar depois de configurar o SMTP, troque para `true`: o cadastro
 * volta a mandar o link de confirmação, "Esqueci minha senha" volta a mandar
 * o link de redefinição e os textos voltam a citar o e-mail.
 */
export const EMAIL_DELIVERY_ENABLED = false;
