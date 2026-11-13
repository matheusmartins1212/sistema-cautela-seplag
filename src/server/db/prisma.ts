import { PrismaClient } from "@prisma/client";
import { isProduction } from "@/server/config/env";

/**
 * Cliente Prisma singleton.
 *
 * Em desenvolvimento, o hot-reload do Next.js recria módulos a cada alteração;
 * sem o cache global isso esgotaria o pool de conexões. Em produção, uma única
 * instância por processo.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ["error"] : ["warn", "error"],
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}
