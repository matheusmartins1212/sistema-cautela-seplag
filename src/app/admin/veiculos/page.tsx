import Link from "next/link";
import type { VehicleCategory, VehicleStatus } from "@prisma/client";
import { listVehicles } from "@/server/modules/vehicles/vehicle.service";
import { listVehiclesQuerySchema } from "@/server/modules/vehicles/vehicle.schemas";
import { toPublicVehicle } from "@/server/modules/vehicles/vehicle.dto";
import { VehicleStatusBadge } from "@/components/vehicles/vehicle-status-badge";
import { VEHICLE_CATEGORY_LABEL, VEHICLE_STATUS_LABEL } from "@/components/vehicles/labels";
import { PageHeader, primaryLinkClass } from "@/components/ui/page-header";
import { FilterBar, FilterField, filterControlClass } from "@/components/ui/filter-bar";
import {
  ChevronCell,
  ChevronTh,
  EmptyRow,
  RowLink,
  TBody,
  THead,
  TableCard,
  Td,
  Th,
  Tr,
} from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { countLabel } from "@/shared/format";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VeiculosPage({ searchParams }: Props) {
  const raw = await searchParams;
  // Só valores preenchidos: o formulário manda "" quando "Todos" está escolhido.
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.length > 0) cleaned[k] = v;
  }

  const query = listVehiclesQuerySchema.parse(cleaned);
  const { items, total, page, pageSize } = await listVehicles(query);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pageHref = (n: number) => {
    const p = new URLSearchParams(cleaned);
    p.set("page", String(n));
    return `/admin/veiculos?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Veículos"
        description={countLabel(total, "veículo", "veículos")}
        actions={
          <Link href="/admin/veiculos/novo" className={primaryLinkClass}>
            Novo veículo
          </Link>
        }
      />

      <FilterBar clearHref="/admin/veiculos">
        <FilterField label="Busca" grow>
          <input
            type="text"
            name="search"
            defaultValue={cleaned.search ?? ""}
            placeholder="Placa, modelo ou marca"
            className={filterControlClass}
          />
        </FilterField>
        <FilterField label="Categoria">
          <select
            name="category"
            defaultValue={cleaned.category ?? ""}
            className={filterControlClass}
          >
            <option value="">Todas</option>
            {Object.entries(VEHICLE_CATEGORY_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Status">
          <select name="status" defaultValue={cleaned.status ?? ""} className={filterControlClass}>
            <option value="">Todos</option>
            {Object.entries(VEHICLE_STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>

      <TableCard minWidth="46rem">
        <THead>
          <Th width="8rem">Placa</Th>
          <Th>Veículo</Th>
          <Th width="10rem">Categoria</Th>
          <Th width="12rem">Status</Th>
          <ChevronTh />
        </THead>
        <TBody>
          {items.length === 0 && <EmptyRow colSpan={5}>Nenhum veículo com esses filtros.</EmptyRow>}
          {items.map((vehicle) => {
            const v = toPublicVehicle(vehicle, { includeNotes: false });
            return (
              <Tr key={v.id} clickable>
                <Td>
                  <RowLink
                    href={`/admin/veiculos/${v.id}`}
                    className="font-mono text-[13px] font-semibold text-institutional-800"
                  >
                    {v.plateFormatted}
                  </RowLink>
                </Td>
                <Td truncate className="font-medium text-gray-900">
                  {v.brand} {v.model}
                </Td>
                <Td>{VEHICLE_CATEGORY_LABEL[v.category as VehicleCategory]}</Td>
                <Td>
                  <VehicleStatusBadge status={v.currentStatus as VehicleStatus} />
                </Td>
                <ChevronCell />
              </Tr>
            );
          })}
        </TBody>
      </TableCard>

      <Pagination page={page} totalPages={totalPages} hrefFor={pageHref} />
    </div>
  );
}
