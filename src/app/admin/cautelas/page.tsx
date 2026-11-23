import { CautionStatus } from "@prisma/client";
import { listAllCautions } from "@/server/modules/cautions/caution.service";
import { listAdminCautionsQuerySchema } from "@/server/modules/cautions/caution.schemas";
import { toPublicCaution } from "@/server/modules/cautions/caution.dto";
import { CautionStatusBadge } from "@/components/cautions/caution-status-badge";
import { CAUTION_STATUS_LABEL } from "@/components/cautions/labels";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar, FilterField, filterControlClass } from "@/components/ui/filter-bar";
import {
  ChevronCell,
  ChevronTh,
  CodeText,
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
import { countLabel, currentYearCuiaba, formatWallClockPeriod } from "@/shared/format";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminCautelasPage({ searchParams }: Props) {
  const raw = await searchParams;
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.length > 0) cleaned[k] = v;
  }

  const query = listAdminCautionsQuerySchema.parse(cleaned);
  const { items, total, page, pageSize } = await listAllCautions(query);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const year = currentYearCuiaba();

  const pageHref = (n: number) => {
    const p = new URLSearchParams(cleaned);
    p.set("page", String(n));
    return `/admin/cautelas?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Viagens" description={countLabel(total, "viagem", "viagens")} />

      <FilterBar clearHref="/admin/cautelas">
        {cleaned.driverId && <input type="hidden" name="driverId" value={cleaned.driverId} />}
        <FilterField label="Busca" grow>
          <input
            type="text"
            name="search"
            defaultValue={cleaned.search ?? ""}
            placeholder="Código, solicitante, condutor, órgão ou placa"
            className={filterControlClass}
          />
        </FilterField>
        <FilterField label="Status">
          <select name="status" defaultValue={cleaned.status ?? ""} className={filterControlClass}>
            <option value="">Todos</option>
            {Object.values(CautionStatus).map((s) => (
              <option key={s} value={s}>
                {CAUTION_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>

      <TableCard minWidth="46rem">
        <THead>
          <Th width="7rem">Código</Th>
          <Th>Responsável</Th>
          <Th>Veículo</Th>
          <Th width="13rem">Saída</Th>
          <Th width="12.5rem">Status</Th>
          <ChevronTh />
        </THead>
        <TBody>
          {items.length === 0 && <EmptyRow colSpan={6}>Nenhuma viagem com esses filtros.</EmptyRow>}
          {items.map((c) => {
            const cau = toPublicCaution(c, {
              includeUser: true,
              includeDriver: true,
              includeVehicle: true,
            });
            return (
              <Tr key={cau.id} clickable>
                <Td>
                  <RowLink href={`/admin/cautelas/${cau.id}`}>
                    <CodeText code={cau.publicCode} />
                  </RowLink>
                </Td>
                <Td truncate className="font-medium text-gray-900">
                  {cau.driver?.fullName ?? cau.user?.fullName ?? "—"}
                </Td>
                <Td
                  truncate
                  title={
                    cau.vehicle ? `${cau.vehicle.model} · ${cau.vehicle.plateFormatted}` : undefined
                  }
                >
                  {cau.vehicle?.model ?? "—"}
                </Td>
                <Td className="tabular-nums">
                  {formatWallClockPeriod(cau.plannedWithdrawalAt, cau.plannedReturnAt, year)}
                </Td>
                <Td>
                  <CautionStatusBadge status={cau.status} />
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
