-- Remoção de órgão do catálogo passa a ser registrada na auditoria.
-- Aditiva: só acrescenta um valor ao enum.

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'AGENCY_DELETED';
