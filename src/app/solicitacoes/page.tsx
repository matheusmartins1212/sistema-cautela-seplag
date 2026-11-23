import Link from "next/link";
import { redirect } from "next/navigation";
import { RequestStatus } from "@prisma/client";
import { getCurrentSession } from "@/server/modules/auth/session";
import { listMyRequests } from "@/server/modules/requests/request.service";
import { listMyRequestsQuerySchema } from "@/server/modules/requests/request.schemas";
import { toPublicRequest } from "@/server/modules/requests/request.dto";
import { RequestStatusBadge } from "@/components/requests/request-status-badge";
import { REQUEST_STATUS_LABEL } from "@/components/requests/labels";
import { PageHeader, primaryLinkClass } from "@/components/ui/page-header";
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
import { countLabel, currentYearCuiaba, formatPeriod } from "@/shared/format";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MinhasSolicitacoesPage({ searchParams }: Props) {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=/solicitacoes");

  const raw = await searchParams;
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.length > 0) cleaned[k] = v;
  }

  const query = listMyRequestsQuerySchema.parse(cleaned);
  const { items, total, page, pageSize } = await listMyRequests(query, session);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const year = currentYearCuiaba();

  const pageHref = (n: number) => {
    const p = new URLSearchParams(cleaned);
    p.set("page", String(n));
    return `/solicitacoes?${p.toString()}`;
  };

  const rows = items.map((req) => toPublicRequest(req));
  const empty = (
    <>
      Você ainda não tem solicitações.{" "}
      <Link
        href="/solicitacoes/nova"
        className="font-medium text-institutional-700 hover:underline"
      >
        Solicitar um veículo
      </Link>
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minhas solicitações"
        description={countLabel(total, "solicitação", "solicitações")}
        actions={
          <Link href="/solicitacoes/nova" className={primaryLinkClass}>
            Nova solicitação
          </Link>
        }
      />

      <FilterBar clearHref="/solicitacoes">
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
      </FilterBar>

      <ul className="space-y-3 sm:hidden">
        {rows.length === 0 && (
          <li className="rounded-card border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-card">
            {empty}
          </li>
        )}
        {rows.map((r) => (
          <MobileCard
            key={r.id}
            href={`/solicitacoes/${r.id}`}
            code={r.publicCode}
            badge={<RequestStatusBadge status={r.status} />}
            title={r.destination}
            subtitle={formatPeriod(
              r.withdrawalDate,
              r.withdrawalTime,
              r.returnDate,
              r.returnTime,
              year,
            )}
          />
        ))}
      </ul>

      <div className="hidden sm:block">
        <TableCard minWidth="46rem">
          <THead>
            <Th width="7rem">Código</Th>
            <Th width="13rem">Saída</Th>
            <Th>Destino</Th>
            <Th width="11.5rem">Status</Th>
            <ChevronTh />
          </THead>
          <TBody>
            {rows.length === 0 && <EmptyRow colSpan={5}>{empty}</EmptyRow>}
            {rows.map((r) => (
              <Tr key={r.id} clickable>
                <Td>
                  <RowLink href={`/solicitacoes/${r.id}`}>
                    <CodeText code={r.publicCode} />
                  </RowLink>
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
                <Td truncate className="font-medium text-gray-900" title={r.destination}>
                  {r.destination}
                </Td>
                <Td>
                  <RequestStatusBadge status={r.status} />
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
