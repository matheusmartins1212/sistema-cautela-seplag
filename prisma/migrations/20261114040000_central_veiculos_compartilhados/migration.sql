-- Central de Veículos Compartilhados
-- O órgão solicita o transporte, a central aloca veículo e condutor.
-- Migração apenas aditiva: colunas novas são opcionais (ou com default), então
-- solicitações e cautelas existentes continuam válidas.

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'USER_DRIVER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'AGENCY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'AGENCY_UPDATED';

-- AlterEnum
ALTER TYPE "EmailTemplate" ADD VALUE 'TRIP_ASSIGNED';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TRIP_ASSIGNED';

-- AlterTable
ALTER TABLE "cautions" ADD COLUMN     "driverId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "agency" TEXT,
ADD COLUMN     "driverLicenseCategory" TEXT,
ADD COLUMN     "driverLicenseExpiresAt" DATE,
ADD COLUMN     "isDriver" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "vehicle_requests" ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "origin" TEXT,
ADD COLUMN     "passengerCount" INTEGER,
ADD COLUMN     "passengerNames" TEXT,
ADD COLUMN     "requestingAgency" TEXT;

-- CreateTable
CREATE TABLE "agencies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_isDriver_idx" ON "users"("isDriver");

-- CreateIndex
CREATE INDEX "vehicle_requests_requestingAgency_idx" ON "vehicle_requests"("requestingAgency");

-- CreateIndex
CREATE INDEX "cautions_driverId_idx" ON "cautions"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "agencies_name_key" ON "agencies"("name");

-- AddForeignKey
ALTER TABLE "cautions" ADD CONSTRAINT "cautions_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
