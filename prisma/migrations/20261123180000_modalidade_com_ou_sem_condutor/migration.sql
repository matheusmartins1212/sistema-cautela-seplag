-- Modalidade da solicitação: com condutor da central ou o próprio servidor
-- retira e dirige (cautela tradicional). Aditiva: pedidos existentes ficam
-- como "sem condutor", que é o que eles eram.

-- AlterTable
ALTER TABLE "vehicle_requests" ADD COLUMN     "withDriver" BOOLEAN NOT NULL DEFAULT false;
