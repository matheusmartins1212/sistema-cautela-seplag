import { CautionStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { env } from "@/server/config/env";
import { logger } from "@/server/lib/logger";
import { recordAudit } from "@/server/lib/audit";
import { createNotification } from "@/server/modules/notifications/notifications.service";
import { sendTransactionalEmail } from "@/server/modules/email/email.service";
import {
  buildOverdueAlert,
  buildReturnReminder,
  buildWithdrawalReminder,
} from "@/server/modules/email/templates/caution-templates";
import { toAppWallClock } from "@/shared/time";

/**
 * Jobs agendados (acionados pela rota /api/cron por um agendador externo).
 *
 * Princípios:
 *  - Idempotência: rodar duas vezes não causa efeito duplicado.
 *  - Tolerância a falha: cada job é isolado; o erro de um não derruba os demais.
 */

// Antecedência (horas) com que os lembretes de retirada/devolução são enviados.
const REMINDER_WINDOW_HOURS = 24;

function formatDateBr(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getUTCFullYear()}`;
}

function formatTimeBr(date: Date): string {
  const h = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

function vehicleLabel(v: { brand: string; model: string; plate: string }): string {
  return `${v.brand} ${v.model} — ${v.plate}`;
}

function cautionUrl(id: string): string {
  return `${env.APP_BASE_URL}/cautelas/${id}`;
}

// Estados em que o veículo está fora e ainda NÃO foi devolvido — passíveis de
// atraso quando o prazo planejado de devolução já passou.
const OVERDUE_SOURCE_STATUSES: CautionStatus[] = [
  CautionStatus.EM_USO,
  CautionStatus.AGUARDANDO_DEVOLUCAO,
];

/**
 * Marca como ATRASADA toda cautela cujo prazo de devolução já passou e que
 * ainda não foi devolvida. Notifica o responsável. Idempotente: cautelas já
 * ATRASADA não são reprocessadas (não estão entre os estados de origem).
 */
export async function markOverdueCautions(now: Date = new Date()): Promise<number> {
  // Horários previstos são "hora de parede" de Cuiabá; compara na mesma base.
  const wallNow = toAppWallClock(now);
  const candidates = await prisma.caution.findMany({
    where: {
      status: { in: OVERDUE_SOURCE_STATUSES },
      plannedReturnAt: { lt: wallNow },
    },
    select: {
      id: true,
      userId: true,
      publicCode: true,
      plannedReturnAt: true,
      user: { select: { email: true, fullName: true } },
      vehicle: { select: { brand: true, model: true, plate: true } },
    },
  });

  for (const c of candidates) {
    await prisma.caution.update({
      where: { id: c.id },
      data: { status: CautionStatus.ATRASADA },
    });
    await createNotification({
      userId: c.userId,
      type: "RETURN_OVERDUE",
      title: "Devolução atrasada",
      message: `A devolução da cautela ${c.publicCode} está atrasada. Regularize o quanto antes.`,
      relatedEntityType: "Caution",
      relatedEntityId: c.id,
    });
    await sendTransactionalEmail(
      buildOverdueAlert({
        to: c.user.email,
        fullName: c.user.fullName,
        publicCode: c.publicCode,
        vehicleLabel: vehicleLabel(c.vehicle),
        returnDate: formatDateBr(c.plannedReturnAt),
        returnTime: formatTimeBr(c.plannedReturnAt),
        detailsUrl: cautionUrl(c.id),
        cautionId: c.id,
      }),
    ).catch(() => undefined);
    await recordAudit({
      action: "STATUS_CHANGED",
      entityType: "Caution",
      entityId: c.id,
      metadata: {
        to: CautionStatus.ATRASADA,
        publicCode: c.publicCode,
        event: "overdue_detected",
      },
    });
  }

  return candidates.length;
}

/**
 * Envia lembretes para cautelas cuja RETIRADA está próxima (dentro da janela) e
 * que ainda não foram lembradas. Idempotente via `withdrawalReminderSentAt`.
 */
export async function sendWithdrawalReminders(now: Date = new Date()): Promise<number> {
  const limit = new Date(toAppWallClock(now).getTime() + REMINDER_WINDOW_HOURS * 3_600_000);
  const candidates = await prisma.caution.findMany({
    where: {
      status: CautionStatus.AGUARDANDO_RETIRADA,
      withdrawalReminderSentAt: null,
      plannedWithdrawalAt: { lte: limit },
    },
    select: {
      id: true,
      publicCode: true,
      plannedWithdrawalAt: true,
      user: { select: { email: true, fullName: true } },
      vehicle: { select: { brand: true, model: true, plate: true } },
    },
  });

  for (const c of candidates) {
    await sendTransactionalEmail(
      buildWithdrawalReminder({
        to: c.user.email,
        fullName: c.user.fullName,
        publicCode: c.publicCode,
        vehicleLabel: vehicleLabel(c.vehicle),
        withdrawalDate: formatDateBr(c.plannedWithdrawalAt),
        withdrawalTime: formatTimeBr(c.plannedWithdrawalAt),
        detailsUrl: cautionUrl(c.id),
        cautionId: c.id,
      }),
    ).catch(() => undefined);
    // Marca como lembrada mesmo se o envio falhar (o EmailLog registra a falha)
    // — evita reenviar a cada execução do job.
    await prisma.caution.update({
      where: { id: c.id },
      data: { withdrawalReminderSentAt: new Date() },
    });
  }

  return candidates.length;
}

/**
 * Envia lembretes para cautelas EM_USO cuja DEVOLUÇÃO está próxima e que ainda
 * não foram lembradas. Idempotente via `returnReminderSentAt`.
 */
export async function sendReturnReminders(now: Date = new Date()): Promise<number> {
  const limit = new Date(toAppWallClock(now).getTime() + REMINDER_WINDOW_HOURS * 3_600_000);
  const candidates = await prisma.caution.findMany({
    where: {
      status: CautionStatus.EM_USO,
      returnReminderSentAt: null,
      plannedReturnAt: { lte: limit },
    },
    select: {
      id: true,
      publicCode: true,
      plannedReturnAt: true,
      user: { select: { email: true, fullName: true } },
      vehicle: { select: { brand: true, model: true, plate: true } },
    },
  });

  for (const c of candidates) {
    await sendTransactionalEmail(
      buildReturnReminder({
        to: c.user.email,
        fullName: c.user.fullName,
        publicCode: c.publicCode,
        vehicleLabel: vehicleLabel(c.vehicle),
        returnDate: formatDateBr(c.plannedReturnAt),
        returnTime: formatTimeBr(c.plannedReturnAt),
        detailsUrl: cautionUrl(c.id),
        cautionId: c.id,
      }),
    ).catch(() => undefined);
    await prisma.caution.update({
      where: { id: c.id },
      data: { returnReminderSentAt: new Date() },
    });
  }

  return candidates.length;
}

export interface AuthCleanupResult {
  sessions: number;
  emailTokens: number;
  resetTokens: number;
}

/**
 * Remove credenciais já inutilizáveis: sessões expiradas ou revogadas e tokens
 * (confirmação de e-mail / reset) consumidos ou expirados. O histórico de
 * autenticação permanece no AuditLog.
 */
export async function cleanupExpiredAuth(now: Date = new Date()): Promise<AuthCleanupResult> {
  const [sessions, emailTokens, resetTokens] = await prisma.$transaction([
    prisma.session.deleteMany({
      where: { OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }] },
    }),
    prisma.emailVerificationToken.deleteMany({
      where: { OR: [{ consumedAt: { not: null } }, { expiresAt: { lt: now } }] },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { OR: [{ consumedAt: { not: null } }, { expiresAt: { lt: now } }] },
    }),
  ]);

  return {
    sessions: sessions.count,
    emailTokens: emailTokens.count,
    resetTokens: resetTokens.count,
  };
}

export interface ScheduledJobsResult {
  overdueCautions: number;
  withdrawalReminders: number;
  returnReminders: number;
  cleanup: AuthCleanupResult;
}

/** Executa um job isolando e logando falha, retornando o fallback em erro. */
async function runJob<T>(name: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logger.error(`Job ${name} falhou`, {
      error: error instanceof Error ? error.message : "unknown",
    });
    return fallback;
  }
}

/**
 * Executa todos os jobs agendados. Cada job é isolado: a falha de um é logada
 * e não impede os demais.
 */
export async function runScheduledJobs(now: Date = new Date()): Promise<ScheduledJobsResult> {
  return {
    overdueCautions: await runJob("markOverdueCautions", () => markOverdueCautions(now), 0),
    withdrawalReminders: await runJob(
      "sendWithdrawalReminders",
      () => sendWithdrawalReminders(now),
      0,
    ),
    returnReminders: await runJob("sendReturnReminders", () => sendReturnReminders(now), 0),
    cleanup: await runJob("cleanupExpiredAuth", () => cleanupExpiredAuth(now), {
      sessions: 0,
      emailTokens: 0,
      resetTokens: 0,
    }),
  };
}
