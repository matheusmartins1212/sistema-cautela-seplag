-- AlterTable
ALTER TABLE "cautions" ADD COLUMN     "returnReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "withdrawalReminderSentAt" TIMESTAMP(3);
