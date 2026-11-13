import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const counts = {
    users: await prisma.user.count(),
    sessions: await prisma.session.count(),
    vehicles: await prisma.vehicle.count(),
    vehicleRequests: await prisma.vehicleRequest.count(),
    cautions: await prisma.caution.count(),
    checklists: await prisma.checklist.count(),
    checklistItems: await prisma.checklistItem.count(),
    checklistPhotos: await prisma.checklistPhoto.count(),
    damageReports: await prisma.damageReport.count(),
    auditLogs: await prisma.auditLog.count(),
    emailLogs: await prisma.emailLog.count(),
    notifications: await prisma.notification.count(),
    cautionReasons: await prisma.cautionReason.count(),
    organizationalUnits: await prisma.organizationalUnit.count(),
    parkingLocations: await prisma.parkingLocation.count(),
    checklistItemTemplates: await prisma.checklistItemTemplate.count(),
  };

  console.log("=== CONTAGEM DE REGISTROS ===");
  for (const [table, count] of Object.entries(counts)) {
    console.log(`${table.padEnd(25)} ${count}`);
  }

  if (counts.users > 0) {
    console.log("\n=== USUÁRIOS ===");
    const users = await prisma.user.findMany({
      select: {
        fullName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    console.table(users);
  }

  if (counts.vehicles > 0) {
    console.log("\n=== VEÍCULOS ===");
    const vehicles = await prisma.vehicle.findMany({
      select: {
        plate: true,
        brand: true,
        model: true,
        category: true,
        currentStatus: true,
      },
    });
    console.table(vehicles);
  }

  if (counts.checklistItemTemplates > 0) {
    console.log("\n=== TEMPLATES DE ITENS DE CHECKLIST (primeiros 10) ===");
    const templates = await prisma.checklistItemTemplate.findMany({
      select: { itemKey: true, label: true, group: true, category: true },
      take: 10,
      orderBy: { sortOrder: "asc" },
    });
    console.table(templates);
  }

  if (counts.cautionReasons > 0) {
    console.log("\n=== MOTIVOS DE CAUTELA ===");
    const reasons = await prisma.cautionReason.findMany({
      select: { name: true, active: true },
    });
    console.table(reasons);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
