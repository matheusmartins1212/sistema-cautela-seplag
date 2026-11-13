-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_EMAIL_VERIFICATION', 'ACTIVE', 'BLOCKED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "VehicleCategory" AS ENUM ('PICKUP', 'SUV', 'HATCH');

-- CreateEnum
CREATE TYPE "VehicleUsageType" AS ENUM ('ADMINISTRATIVO', 'OPERACIONAL');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('DISPONIVEL', 'RESERVADO', 'AGUARDANDO_RETIRADA', 'EM_USO', 'AGUARDANDO_DEVOLUCAO', 'DEVOLVIDO', 'EM_ANALISE', 'BLOQUEADO', 'EM_MANUTENCAO', 'BAIXADO', 'INATIVO');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDENTE_ANALISE', 'APROVADA', 'NAO_APROVADA', 'CANCELADA_PELO_USUARIO', 'CANCELADA_PELO_ADMIN', 'AJUSTE_SOLICITADO');

-- CreateEnum
CREATE TYPE "CautionStatus" AS ENUM ('AGUARDANDO_RETIRADA', 'RETIRADA_EM_ANDAMENTO', 'EM_USO', 'AGUARDANDO_DEVOLUCAO', 'DEVOLUCAO_EM_ANALISE', 'FINALIZADA', 'FINALIZADA_COM_OBSERVACAO', 'CANCELADA', 'ATRASADA');

-- CreateEnum
CREATE TYPE "Shift" AS ENUM ('MATUTINO', 'VESPERTINO', 'INTEGRAL');

-- CreateEnum
CREATE TYPE "ChecklistType" AS ENUM ('RETIRADA', 'DEVOLUCAO');

-- CreateEnum
CREATE TYPE "ChecklistStatus" AS ENUM ('PENDENTE', 'EM_PREENCHIMENTO', 'ENVIADO', 'EM_ANALISE', 'APROVADO', 'RETIFICADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "ChecklistAnswer" AS ENUM ('BOM', 'RUIM', 'AUSENTE', 'NAO_SE_APLICA');

-- CreateEnum
CREATE TYPE "FuelLevel" AS ENUM ('CHEIO', 'TRES_QUARTOS', 'MEIO', 'UM_QUARTO', 'RESERVA', 'VAZIO');

-- CreateEnum
CREATE TYPE "CleanlinessLevel" AS ENUM ('LIMPO', 'REGULAR', 'SUJO');

-- CreateEnum
CREATE TYPE "FuelCardStatus" AS ENUM ('PRESENTE', 'AUSENTE', 'NAO_SE_APLICA');

-- CreateEnum
CREATE TYPE "PhotoType" AS ENUM ('DIANTEIRA', 'TRASEIRA', 'LATERAL_ESQUERDA', 'LATERAL_DIREITA', 'INTERIOR', 'PAINEL', 'QUILOMETRAGEM', 'COMBUSTIVEL', 'LOCAL_ESTACIONADO', 'AVARIA', 'ITEM', 'OUTRA');

-- CreateEnum
CREATE TYPE "DamageSeverity" AS ENUM ('LEVE', 'MODERADA', 'GRAVE');

-- CreateEnum
CREATE TYPE "DamageStatus" AS ENUM ('ABERTA', 'EM_ANALISE', 'RESOLVIDA', 'IMPROCEDENTE');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'RETRYING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmailTemplate" AS ENUM ('EMAIL_CONFIRMATION', 'PASSWORD_RESET', 'REQUEST_RECEIVED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'WITHDRAWAL_REMINDER', 'RETURN_REMINDER', 'OVERDUE_ALERT', 'CHECKLIST_PENDING');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REQUEST_RECEIVED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'CHECKLIST_RELEASED', 'CHECKLIST_PENDING', 'RETURN_OVERDUE', 'DAMAGE_UNDER_REVIEW', 'GENERAL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'REGISTER', 'EMAIL_CONFIRMED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'REQUEST_CREATED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'REQUEST_CANCELLED', 'REQUEST_ADJUSTMENT_REQUESTED', 'CAUTION_FINALIZED', 'CAUTION_CANCELLED', 'STATUS_CHANGED', 'CHECKLIST_STARTED', 'CHECKLIST_SUBMITTED', 'CHECKLIST_REVIEWED', 'CHECKLIST_RECTIFIED', 'PHOTO_UPLOADED', 'VEHICLE_CREATED', 'VEHICLE_UPDATED', 'VEHICLE_STATUS_CHANGED', 'VEHICLE_BLOCKED', 'VEHICLE_UNBLOCKED', 'USER_ACTIVATED', 'USER_DEACTIVATED', 'USER_ROLE_CHANGED', 'UNAUTHORIZED_ACCESS_ATTEMPT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_EMAIL_VERIFICATION',
    "passwordHash" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "internalCode" TEXT,
    "category" "VehicleCategory" NOT NULL,
    "usageType" "VehicleUsageType" NOT NULL,
    "linkedSector" TEXT,
    "agency" TEXT,
    "currentStatus" "VehicleStatus" NOT NULL DEFAULT 'DISPONIVEL',
    "currentMileage" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_requests" (
    "id" TEXT NOT NULL,
    "publicCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "withdrawalDate" DATE NOT NULL,
    "returnDate" DATE NOT NULL,
    "shift" "Shift" NOT NULL,
    "withdrawalTime" TEXT NOT NULL,
    "returnTime" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "termNumber" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDENTE_ANALISE',
    "adminId" TEXT,
    "rejectionReason" TEXT,
    "adminNotes" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cautions" (
    "id" TEXT NOT NULL,
    "publicCode" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "status" "CautionStatus" NOT NULL DEFAULT 'AGUARDANDO_RETIRADA',
    "approvedByAdminId" TEXT,
    "plannedWithdrawalAt" TIMESTAMP(3) NOT NULL,
    "plannedReturnAt" TIMESTAMP(3) NOT NULL,
    "actualWithdrawalAt" TIMESTAMP(3),
    "actualReturnAt" TIMESTAMP(3),
    "finalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cautions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklists" (
    "id" TEXT NOT NULL,
    "cautionId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ChecklistType" NOT NULL,
    "status" "ChecklistStatus" NOT NULL DEFAULT 'PENDENTE',
    "realDate" DATE,
    "realTime" TEXT,
    "mileage" INTEGER,
    "fuelLevel" "FuelLevel",
    "fuelCardStatus" "FuelCardStatus",
    "internalCleanliness" "CleanlinessLevel",
    "externalCleanliness" "CleanlinessLevel",
    "parkingLocation" TEXT,
    "hasChangesFromInitial" BOOLEAN,
    "changesDescription" TEXT,
    "hasDamage" BOOLEAN,
    "damageDescription" TEXT,
    "generalNotes" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmedByUserId" TEXT,
    "confirmationIp" TEXT,
    "confirmationUa" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedByAdminId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "itemLabel" TEXT NOT NULL,
    "category" TEXT,
    "answer" "ChecklistAnswer",
    "observation" TEXT,
    "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_photos" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "checklistItemId" TEXT,
    "type" "PhotoType" NOT NULL,
    "fileKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "damage_reports" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "cautionId" TEXT,
    "checklistId" TEXT,
    "description" TEXT NOT NULL,
    "severity" "DamageSeverity" NOT NULL DEFAULT 'LEVE',
    "status" "DamageStatus" NOT NULL DEFAULT 'ABERTA',
    "createdByUserId" TEXT NOT NULL,
    "reviewedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "damage_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" "UserRole",
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" "EmailTemplate" NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
    "readAt" TIMESTAMP(3),
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caution_reasons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caution_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizational_units" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizational_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parking_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_item_templates" (
    "id" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "group" TEXT,
    "category" "VehicleCategory",
    "requiresPhotoOnIssue" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_item_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "users_registrationNumber_key" ON "users"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_tokenHash_key" ON "email_verification_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_userId_idx" ON "email_verification_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plate_key" ON "vehicles"("plate");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_internalCode_key" ON "vehicles"("internalCode");

-- CreateIndex
CREATE INDEX "vehicles_category_idx" ON "vehicles"("category");

-- CreateIndex
CREATE INDEX "vehicles_currentStatus_idx" ON "vehicles"("currentStatus");

-- CreateIndex
CREATE INDEX "vehicles_active_idx" ON "vehicles"("active");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_requests_publicCode_key" ON "vehicle_requests"("publicCode");

-- CreateIndex
CREATE INDEX "vehicle_requests_userId_idx" ON "vehicle_requests"("userId");

-- CreateIndex
CREATE INDEX "vehicle_requests_status_idx" ON "vehicle_requests"("status");

-- CreateIndex
CREATE INDEX "vehicle_requests_withdrawalDate_idx" ON "vehicle_requests"("withdrawalDate");

-- CreateIndex
CREATE UNIQUE INDEX "cautions_publicCode_key" ON "cautions"("publicCode");

-- CreateIndex
CREATE UNIQUE INDEX "cautions_requestId_key" ON "cautions"("requestId");

-- CreateIndex
CREATE INDEX "cautions_userId_idx" ON "cautions"("userId");

-- CreateIndex
CREATE INDEX "cautions_vehicleId_idx" ON "cautions"("vehicleId");

-- CreateIndex
CREATE INDEX "cautions_status_idx" ON "cautions"("status");

-- CreateIndex
CREATE INDEX "checklists_status_idx" ON "checklists"("status");

-- CreateIndex
CREATE INDEX "checklists_userId_idx" ON "checklists"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "checklists_cautionId_type_key" ON "checklists"("cautionId", "type");

-- CreateIndex
CREATE INDEX "checklist_items_checklistId_idx" ON "checklist_items"("checklistId");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_items_checklistId_itemKey_key" ON "checklist_items"("checklistId", "itemKey");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_photos_fileKey_key" ON "checklist_photos"("fileKey");

-- CreateIndex
CREATE INDEX "checklist_photos_checklistId_idx" ON "checklist_photos"("checklistId");

-- CreateIndex
CREATE INDEX "damage_reports_vehicleId_idx" ON "damage_reports"("vehicleId");

-- CreateIndex
CREATE INDEX "damage_reports_status_idx" ON "damage_reports"("status");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_idx" ON "audit_logs"("actorUserId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");

-- CreateIndex
CREATE INDEX "email_logs_template_idx" ON "email_logs"("template");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "caution_reasons_name_key" ON "caution_reasons"("name");

-- CreateIndex
CREATE UNIQUE INDEX "organizational_units_name_key" ON "organizational_units"("name");

-- CreateIndex
CREATE UNIQUE INDEX "parking_locations_name_key" ON "parking_locations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_item_templates_itemKey_key" ON "checklist_item_templates"("itemKey");

-- CreateIndex
CREATE INDEX "checklist_item_templates_category_idx" ON "checklist_item_templates"("category");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_requests" ADD CONSTRAINT "vehicle_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_requests" ADD CONSTRAINT "vehicle_requests_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cautions" ADD CONSTRAINT "cautions_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "vehicle_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cautions" ADD CONSTRAINT "cautions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cautions" ADD CONSTRAINT "cautions_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cautions" ADD CONSTRAINT "cautions_approvedByAdminId_fkey" FOREIGN KEY ("approvedByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_cautionId_fkey" FOREIGN KEY ("cautionId") REFERENCES "cautions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_photos" ADD CONSTRAINT "checklist_photos_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_photos" ADD CONSTRAINT "checklist_photos_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "checklist_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_photos" ADD CONSTRAINT "checklist_photos_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_reports" ADD CONSTRAINT "damage_reports_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_reports" ADD CONSTRAINT "damage_reports_cautionId_fkey" FOREIGN KEY ("cautionId") REFERENCES "cautions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_reports" ADD CONSTRAINT "damage_reports_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "checklists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_reports" ADD CONSTRAINT "damage_reports_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_reports" ADD CONSTRAINT "damage_reports_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
