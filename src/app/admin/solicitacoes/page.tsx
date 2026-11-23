import { RequestStatus } from "@prisma/client";
import { listAllRequests } from "@/server/modules/requests/request.service";
import { listAdminRequestsQuerySchema } from "@/server/modules/requests/request.schemas";
import { toPublicRequest } from "@/server/modules/requests/request.dto";
import { RequestStatusBadge } from "@/components/requests/request-status-badge";
import { REQUEST_STATUS_LABEL } from "@/components/requests/labels";
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
import { countLabel, currentYearCuiaba, formatPeriod } from "@/shared/format";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminSolicitacoesPage({ searchParams }: Props) {
  const raw = await searchParams;
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.length > 0) cleaned[k] = v;
  }

  const query = listAdminRequestsQuerySchema.parse(cleaned);
  const { items, total, page, pageSize } = await listAllRequests(query);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const year = currentYearCuiaba();

  const pageHref = (n: number) => {
    const p = new URLSearchParams(cleaned);
    p.set("page", String(n));
    return `/admin/solicitacoes?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitações"
        description={countLabel(total, "solicitação", "solicitações")}
      />

      <FilterBar clearHref="/admin/solicitacoes">
        <FilterField label="Busca" grow>
          <input
            type="text"
            name="search"
            defaultValue={cleaned.search ?? ""}
            placeholder="Código, solicitante ou destino"
            className={filterControlClass}
          />
        </FilterField>
        <FilterField label="Status">
          <select name="status" defaultValue={cleaned.status ?? ""} className={filterControlClass}>
            <option value="">Todos</option>
            {Object.values(RequestStatus).map((s) => (
              <option key={s} value={s}>
                {REQUEST_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Saída de">
          <input
            type="date"
            name="withdrawalDateFrom"
            defaultValue={cleaned.withdrawalDateFrom ?? ""}
            className={filterControlClass}
          />
        </FilterField>
        <FilterField label="Saída até">
          <input
            type="date"
            name="withdrawalDateTo"
            defaultValue={cleaned.withdrawalDateTo ?? ""}
            className={filterControlClass}
          />
        </FilterField>
      </FilterBar>

      <TableCard minWidth="46rem">
        <THead>
          <Th width="7rem">Código</Th>
          <Th>Solicitante</Th>
          <Th width="13rem">Saída</Th>
          <Th>Destino</Th>
          <Th width="11.5rem">Status</Th>
          <ChevronTh />
        </THead>
        <TBody>
          {items.length === 0 && (
            <EmptyRow colSpan={6}>Nenhuma solicitação com esses filtros.</EmptyRow>
          )}
          {items.map((req) => {
            const r = toPublicRequest(req, { includeUser: true });
            return (
              <Tr key={r.id} clickable>
                <Td>
                  <RowLink href={`/admin/solicitacoes/${r.id}`}>
                    <CodeText code={r.publicCode} />
                  </RowLink>
                </Td>
                <Td truncate className="font-medium text-gray-900">
                  {r.user?.fullName ?? "—"}
                </Td>
                <Td className="tabular-nums">
                  {formatPeriod(
                    r.withdrawalDate,
                    r.withdrawalTime,
                    r.returnDate,
                    r.returnTime,
                    year,
                  )}
                </Td>
                <Td truncate title={r.destination}>
                  {r.destination}
                </Td>
                <Td>
                  <RequestStatusBadge status={r.status} />
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
