import { z } from "zod";
import { env } from "@/server/config/env";
import { normalizeCpf, isValidCpf } from "@/shared/validation/cpf";
import {
  describeAllowedDomains,
  isAllowedInstitutionalEmail,
  normalizeEmail,
} from "@/shared/validation/email-domain";
import { checkPasswordStrength } from "@/shared/validation/password";

/**
 * Schemas de entrada da autenticação. Toda regra crítica (domínio do e-mail,
 * validade do CPF, força da senha) é aplicada AQUI, no backend, via Zod.
 */

const institutionalEmail = z
  .string()
  .transform((v) => normalizeEmail(v))
  .refine((email) => isAllowedInstitutionalEmail(email, env.ALLOWED_EMAIL_DOMAIN), {
    message: `O e-mail deve ser institucional (${describeAllowedDomains(env.ALLOWED_EMAIL_DOMAIN)}).`,
  });

const strongPassword = z.string().superRefine((value, ctx) => {
  const result = checkPasswordStrength(value);
  if (!result.valid) {
    for (const message of result.errors) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    }
  }
});

const cpfField = z
  .string()
  .transform((v) => normalizeCpf(v))
  .refine((cpf) => isValidCpf(cpf), { message: "CPF inválido." });

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(3, "Informe o nome completo."),
    cpf: cpfField,
    registrationNumber: z.string().trim().min(1, "Informe o número de matrícula.").max(30),
    email: institutionalEmail,
    phone: z.string().trim().min(8, "Informe um telefone válido.").max(20),
    sector: z.string().trim().min(1, "Informe o setor."),
    department: z.string().trim().min(1, "Informe a lotação."),
    // Órgão de origem (catálogo da central). Validado contra o catálogo no service.
    agency: z
      .string()
      .trim()
      .max(150)
      .transform((v) => (v.length === 0 ? null : v))
      .nullable()
      .optional(),
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().transform((v) => normalizeEmail(v)),
  password: z.string().min(1, "Informe a senha."),
});

export const resendConfirmationSchema = z.object({
  email: z.string().transform((v) => normalizeEmail(v)),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().transform((v) => normalizeEmail(v)),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem.",
    path: ["confirmPassword"],
  });

/** Troca obrigatória após a senha provisória. */
export const changeTemporaryPasswordSchema = z
  .object({
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem.",
    path: ["confirmPassword"],
  });

/** Troca da própria senha, a partir do perfil (exige a senha atual). */
export const changeOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual.").max(256),
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
