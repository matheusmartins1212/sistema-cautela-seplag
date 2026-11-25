-- Senha provisória gerada pela central e pedido de nova senha sem e-mail.
-- Aditiva: contas existentes ficam sem troca obrigatória e sem pedido.

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'PASSWORD_TEMPORARY_SET';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordResetRequestedAt" TIMESTAMP(3);
