import { redirect } from "next/navigation";
import { CautionStatus } from "@prisma/client";
import { getCurrentSession } from "@/server/modules/auth/session";
import { listMyCautions } from "@/server/modules/cautions/caution.service";
import { listMyCautionsQuerySchema } from "@/server/modules/cautions/caution.schemas";
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
  MobileCard,
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

export default async function MinhasViagensPage({ searchParams }: Props) {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=/cautelas");

  const raw = await searchParams;
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.length > 0) cleaned[k] = v;
  }
  const query = listMyCautionsQuerySchema.parse(cleaned);
  const { items, total, page, pageSize } = await listMyCautions(query, session);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const year = currentYearCuiaba();

  const pageHref = (n: number) => {
    const p = new URLSearchParams(cleaned);
    p.set("page", String(n));
    return `/cautelas?${p.toString()}`;
  };

  const rows = items.map((c) => toPublicCaution(c, { includeRequest: true, includeVehicle: true }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minhas viagens"
        description={`${countLabel(total, "viagem", "viagens")} em que você está com o veículo`}
      />

      <FilterBar clearHref="/cautelas">
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

      <ul className="space-y-3 sm:hidden">
        {rows.length === 0 && (
          <li className="rounded-card border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-card">
            Nenhuma viagem por aqui ainda.
          </li>
        )}
        {rows.map((cau) => (
          <MobileCard
            key={cau.id}
            href={`/cautelas/${cau.id}`}
            code={cau.publicCode}
            badge={<CautionStatusBadge status={cau.status} />}
            title={cau.request?.destination ?? "—"}
            subtitle={formatWallClockPeriod(cau.plannedWithdrawalAt, cau.plannedReturnAt, year)}
          />
        ))}
      </ul>

      <div className="hidden sm:block">
        <TableCard minWidth="46rem">
          <THead>
            <Th width="7rem">Código</Th>
            <Th>Destino</Th>
            <Th>Veículo</Th>
            <Th width="13rem">Saída</Th>
            <Th width="12.5rem">Status</Th>
            <ChevronTh />
          </THead>
          <TBody>
            {rows.length === 0 && <EmptyRow colSpan={6}>Nenhuma viagem por aqui ainda.</EmptyRow>}
            {rows.map((cau) => (
              <Tr key={cau.id} clickable>
                <Td>
                  <RowLink href={`/cautelas/${cau.id}`}>
                    <CodeText code={cau.publicCode} />
                  </RowLink>
                </Td>
                <Td truncate className="font-medium text-gray-900" title={cau.request?.destination}>
                  {cau.request?.destination ?? "—"}
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
            ))}
          </TBody>
        </TableCard>
      </div>

      <Pagination page={page} totalPages={totalPages} hrefFor={pageHref} />
    </div>
  );
}
