/**
 * Seed inicial do Sistema de Cautela de Veículos — SEPLAG / SATGF.
 *
 * Idempotente (usa upsert): pode ser executado múltiplas vezes com segurança.
 * Popula catálogos institucionais e cria o super administrador inicial a partir
 * de variáveis de ambiente (NUNCA com senha hardcoded no código).
 *
 * Execução: `npm run db:seed`
 */
import { PrismaClient, VehicleCategory } from "@prisma/client";
import { normalizeCpf, isValidCpf } from "../src/shared/validation/cpf";
import { normalizeEmail } from "../src/shared/validation/email-domain";
import { hashPassword } from "../src/server/lib/password";

const prisma = new PrismaClient();

// ----------------------------------------------------------------------------
// Catálogos
// ----------------------------------------------------------------------------

// Motivos de cautela (catálogo inicial; ajuste conforme a realidade da SEPLAG)
const CAUTION_REASONS = [
  "Viagem a serviço dentro do Estado",
  "Viagem a serviço fora do Estado",
  "Reunião externa",
  "Entrega e retirada de documentos",
  "Vistoria técnica",
  "Atendimento a outro órgão",
  "Evento institucional",
  "Outro",
];

// Lotações / setores (catálogo inicial; ajuste conforme o organograma da SEPLAG)
const ORG_UNITS = [
  "Gabinete do Secretário",
  "SATGF",
  "Planejamento",
  "Orçamento",
  "Gestão de Pessoas",
  "Patrimônio e Serviços",
  "Aquisições",
  "Tecnologia da Informação",
  "Administrativo e Financeiro",
  "Outro",
];

// Locais de estacionamento
const PARKING_LOCATIONS = [
  "Pátio principal",
  "Estacionamento interno",
  "Estacionamento externo",
  "Outro",
];

// Seção 18 — Itens de checklist
type ItemDef = { label: string; group: string; category?: VehicleCategory };

// Diacríticos combinantes U+0300–U+036F (fonte ASCII via code points).
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");
const slug = (label: string) =>
  label
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

// Itens gerais (todas as categorias — category indefinido)
const GENERAL_ITEMS: ItemDef[] = [
  { label: "Para-brisas", group: "VIDROS" },
  { label: "Limpador do para-brisas", group: "VIDROS" },
  { label: "Vidro traseiro", group: "VIDROS" },
  { label: "Vidros laterais", group: "VIDROS" },
  { label: "Faróis dianteiros", group: "ILUMINACAO" },
  { label: "Pisca-alerta dianteiro", group: "ILUMINACAO" },
  { label: "Pisca-alerta traseiro", group: "ILUMINACAO" },
  { label: "Luz de freio", group: "ILUMINACAO" },
  { label: "Luz de ré", group: "ILUMINACAO" },
  { label: "Lanternas traseiras", group: "ILUMINACAO" },
  { label: "Nível de óleo do motor", group: "NIVEIS" },
  { label: "Nível do líquido de arrefecimento", group: "NIVEIS" },
  { label: "Nível do fluido de freio", group: "NIVEIS" },
  { label: "Nível do limpador de para-brisas", group: "NIVEIS" },
  { label: "Retrovisores externos", group: "ESPELHOS" },
  { label: "Retrovisor interno", group: "ESPELHOS" },
  { label: "Para-choque dianteiro", group: "CARROCERIA" },
  { label: "Para-choque traseiro", group: "CARROCERIA" },
  { label: "Estado dos pneus", group: "PNEUS" },
  { label: "Estepe", group: "PNEUS" },
  { label: "Chave de rodas", group: "ACESSORIOS" },
  { label: "Macaco", group: "ACESSORIOS" },
  { label: "Triângulo", group: "ACESSORIOS" },
  { label: "Jogo de tapetes", group: "ACESSORIOS" },
  { label: "Cartão de abastecimento", group: "DOCUMENTOS" },
  { label: "Limpeza interna", group: "LIMPEZA" },
  { label: "Limpeza externa", group: "LIMPEZA" },
];

const PICKUP_ITEMS: ItemDef[] = [
  { label: "Tampa da caçamba", group: "ESPECIFICO", category: "PICKUP" },
  { label: "Tampa do capô", group: "ESPECIFICO", category: "PICKUP" },
  { label: "Capota marítima", group: "ESPECIFICO", category: "PICKUP" },
  { label: "Protetor de caçamba", group: "ESPECIFICO", category: "PICKUP" },
  { label: "Estribo", group: "ESPECIFICO", category: "PICKUP" },
  { label: "Santo Antônio", group: "ESPECIFICO", category: "PICKUP" },
  { label: "Engate", group: "ESPECIFICO", category: "PICKUP" },
];

const SUV_ITEMS: ItemDef[] = [
  { label: "Porta-malas", group: "ESPECIFICO", category: "SUV" },
  { label: "Tampa traseira", group: "ESPECIFICO", category: "SUV" },
  { label: "Bagagito", group: "ESPECIFICO", category: "SUV" },
  { label: "Rack", group: "ESPECIFICO", category: "SUV" },
];

const HATCH_ITEMS: ItemDef[] = [
  { label: "Porta-malas", group: "ESPECIFICO", category: "HATCH" },
  { label: "Tampão traseiro", group: "ESPECIFICO", category: "HATCH" },
  { label: "Tampa traseira", group: "ESPECIFICO", category: "HATCH" },
];

const ALL_ITEMS = [...GENERAL_ITEMS, ...PICKUP_ITEMS, ...SUV_ITEMS, ...HATCH_ITEMS];

// ----------------------------------------------------------------------------
// Seed
// ----------------------------------------------------------------------------

async function seedCatalog(
  upsertOne: (name: string, sortOrder: number) => Promise<unknown>,
  names: string[],
) {
  await Promise.all(names.map((name, index) => upsertOne(name, index)));
}

async function seedChecklistItems() {
  await Promise.all(
    ALL_ITEMS.map((item, index) => {
      // itemKey único: prefixa com categoria quando específico para evitar
      // colisão (ex.: "porta-malas" existe em SUV e HATCH).
      const itemKey = item.category
        ? `${item.category.toLowerCase()}_${slug(item.label)}`
        : slug(item.label);
      return prisma.checklistItemTemplate.upsert({
        where: { itemKey },
        update: {
          label: item.label,
          group: item.group,
          category: item.category ?? null,
          sortOrder: index,
          active: true,
        },
        create: {
          itemKey,
          label: item.label,
          group: item.group,
          category: item.category ?? null,
          sortOrder: index,
        },
      });
    }),
  );
}

async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME ?? "Administrador do Sistema";
  const cpfRaw = process.env.SUPER_ADMIN_CPF;
  const registration = process.env.SUPER_ADMIN_REGISTRATION;

  if (!email || !password || !cpfRaw || !registration) {
    console.warn("[seed] SUPER_ADMIN_* não definido no .env — pulando criação do super admin.");
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  const cpf = normalizeCpf(cpfRaw);
  if (!isValidCpf(cpf)) {
    console.warn(
      "[seed] SUPER_ADMIN_CPF inválido — o super admin será criado mesmo assim (ajuste depois).",
    );
  }

  // Mesmos parâmetros Argon2id da aplicação (fonte única em src/server/lib/password).
  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
    create: {
      fullName: name,
      cpf,
      registrationNumber: registration,
      email: normalizedEmail,
      phone: "",
      sector: "SATGF",
      department: "SATGF",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`[seed] Super admin garantido: ${normalizedEmail}`);
}

async function main() {
  console.log("[seed] Iniciando...");

  await seedCatalog(
    (name, sortOrder) =>
      prisma.cautionReason.upsert({
        where: { name },
        update: { sortOrder, active: true },
        create: { name, sortOrder },
      }),
    CAUTION_REASONS,
  );
  console.log(`[seed] Motivos de cautela: ${CAUTION_REASONS.length}`);

  await seedCatalog(
    (name, sortOrder) =>
      prisma.organizationalUnit.upsert({
        where: { name },
        update: { sortOrder, active: true },
        create: { name, sortOrder },
      }),
    ORG_UNITS,
  );
  console.log(`[seed] Lotações/setores: ${ORG_UNITS.length}`);

  await seedCatalog(
    (name, sortOrder) =>
      prisma.parkingLocation.upsert({
        where: { name },
        update: { sortOrder, active: true },
        create: { name, sortOrder },
      }),
    PARKING_LOCATIONS,
  );
  console.log(`[seed] Locais de estacionamento: ${PARKING_LOCATIONS.length}`);

  await seedChecklistItems();
  console.log(`[seed] Itens de checklist (templates): ${ALL_ITEMS.length}`);

  await seedSuperAdmin();

  console.log("[seed] Concluído com sucesso.");
}

main()
  .catch((error) => {
    console.error("[seed] Falhou:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
