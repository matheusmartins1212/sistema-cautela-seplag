import type { Caution, Prisma } from "@prisma/client";

/**
 * Quem conduz a viagem e responde pelos checklists: o condutor escalado pela
 * central. Viagens antigas (cautela, sem condutor) seguem com o solicitante.
 */
export function responsibleUserId(c: Pick<Caution, "driverId" | "userId">): string {
  return c.driverId ?? c.userId;
}

/** Filtro das viagens pelas quais o usuário responde como condutor. */
export function responsibleWhere(userId: string): Prisma.CautionWhereInput {
  return { OR: [{ driverId: userId }, { driverId: null, userId }] };
}

/** Solicitante ou condutor da viagem (quem pode consultá-la além da central). */
export function isTripParticipant(
  c: Pick<Caution, "driverId" | "userId">,
  userId: string,
): boolean {
  return c.userId === userId || c.driverId === userId;
}
