/**
 * Erros de aplicação tipados.
 *
 * Cada AppError carrega um código estável, um status HTTP e uma mensagem
 * AMIGÁVEL e GENÉRICA, segura para exibir ao usuário (nunca expõe stack trace
 * ou detalhe interno). Mensagens propositalmente não revelam se um e-mail
 * existe (anti-enumeração).
 */
export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "INVALID_CREDENTIALS"
  | "INVALID_OR_EXPIRED_TOKEN"
  | "EMAIL_NOT_VERIFIED"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  CONFLICT: 409,
  INVALID_CREDENTIALS: 401,
  INVALID_OR_EXPIRED_TOKEN: 400,
  EMAIL_NOT_VERIFIED: 403,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  /** Detalhes de validação seguros para o cliente (campo → mensagens). */
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: AppErrorCode,
    message: string,
    options?: { fieldErrors?: Record<string, string[]> },
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.fieldErrors = options?.fieldErrors;
  }
}

// Fábricas convenientes com mensagens genéricas padrão.
export const Errors = {
  validation: (message = "Dados inválidos.", fieldErrors?: Record<string, string[]>) =>
    new AppError("VALIDATION_ERROR", message, { fieldErrors }),
  unauthorized: (message = "Autenticação necessária.") => new AppError("UNAUTHORIZED", message),
  forbidden: (message = "Você não possui permissão para acessar este recurso.") =>
    new AppError("FORBIDDEN", message),
  notFound: (message = "Recurso não encontrado.") => new AppError("NOT_FOUND", message),
  rateLimited: (message = "Muitas tentativas. Tente novamente mais tarde.") =>
    new AppError("RATE_LIMITED", message),
  conflict: (message = "Não foi possível concluir a operação.") =>
    new AppError("CONFLICT", message),
  invalidCredentials: (message = "Credenciais inválidas.") =>
    new AppError("INVALID_CREDENTIALS", message),
  invalidOrExpiredToken: (message = "Link inválido ou expirado.") =>
    new AppError("INVALID_OR_EXPIRED_TOKEN", message),
  emailNotVerified: (message = "Confirme seu e-mail antes de acessar a plataforma.") =>
    new AppError("EMAIL_NOT_VERIFIED", message),
  internal: (message = "Não foi possível processar a solicitação.") =>
    new AppError("INTERNAL_ERROR", message),
};
