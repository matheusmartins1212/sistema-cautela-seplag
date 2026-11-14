import { NextResponse } from "next/server";
import { handleRoute } from "@/server/lib/http";
import { requireAdmin } from "@/server/modules/auth/guards";
import { reportExportSchema, toDateRange } from "@/server/modules/reports/reports.schemas";
import { getCautionStats, getDamagesByVehicle } from "@/server/modules/reports/reports.service";

export const runtime = "nodejs";

/** Serializa linhas em CSV (RFC 4180), com BOM para abrir certo no Excel. */
function toCsv(header: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header, ...rows].map((r) => r.map(escape).join(","));
  return "﻿" + lines.join("\r\n");
}

export const GET = handleRoute(async (req) => {
  await requireAdmin();
  const url = new URL(req.url);
  const query = reportExportSchema.parse(Object.fromEntries(url.searchParams.entries()));
  const range = toDateRange(query);

  let header: string[];
  let rows: (string | number)[][];
  let filename: string;

  if (query.type === "vehicle-usage") {
    const { vehicleUsage } = await getCautionStats(range);
    header = ["Veiculo", "Placa", "Viagens"];
    rows = vehicleUsage.map((r) => [r.label, r.plate, r.count]);
    filename = "uso-de-veiculos.csv";
  } else if (query.type === "by-sector") {
    const { bySector } = await getCautionStats(range);
    header = ["Setor/Lotacao", "Viagens"];
    rows = bySector.map((r) => [r.department, r.count]);
    filename = "viagens-por-setor.csv";
  } else if (query.type === "by-agency") {
    const { byAgency } = await getCautionStats(range);
    header = ["Orgao", "Viagens"];
    rows = byAgency.map((r) => [r.agency, r.count]);
    filename = "viagens-por-orgao.csv";
  } else if (query.type === "by-driver") {
    const { byDriver } = await getCautionStats(range);
    header = ["Condutor", "Viagens"];
    rows = byDriver.map((r) => [r.driver, r.count]);
    filename = "viagens-por-condutor.csv";
  } else {
    const damages = await getDamagesByVehicle(range);
    header = ["Placa", "Avarias"];
    rows = damages.map((r) => [r.plate, r.count]);
    filename = "avarias-por-veiculo.csv";
  }

  return new NextResponse(toCsv(header, rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
});
