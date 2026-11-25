import { UserRole, UserStatus } from "@prisma/client";
import { listUsers } from "@/server/modules/users/user.service";
import { listUsersQuerySchema } from "@/server/modules/users/user.schemas";
import { toPublicUser } from "@/server/modules/users/user.dto";
import { UserStatusBadge } from "@/components/users/user-status-badge";
import { Badge } from "@/components/ui/badge";
import { USER_ROLE_LABEL, USER_STATUS_LABEL } from "@/components/users/labels";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar, FilterField, filterControlClass } from "@/components/ui/filter-bar";
import {
  ChevronCell,
  ChevronTh,
  EmptyRow,
  Muted,
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

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminUsuariosPage({ searchParams }: Props) {
  const raw = await searchParams;
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.length > 0) cleaned[k] = v;
  }

  const query = listUsersQuerySchema.parse(cleaned);
  const { items, total, page, pageSize } = await listUsers(query);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pageHref = (n: number) => {
    const p = new URLSearchParams(cleaned);
    p.set("page", String(n));
    return `/admin/usuarios?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Usuários" description={countLabel(total, "conta", "contas")} />

      <FilterBar clearHref="/admin/usuarios">
        <FilterField label="Busca" grow>
          <input
            type="text"
            name="search"
            defaultValue={cleaned.search ?? ""}
            placeholder="Nome, e-mail, matrícula ou CPF"
            className={filterControlClass}
          />
        </FilterField>
        <FilterField label="Status">
          <select name="status" defaultValue={cleaned.status ?? ""} className={filterControlClass}>
            <option value="">Todos</option>
            {Object.values(UserStatus).map((s) => (
              <option key={s} value={s}>
                {USER_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Perfil">
          <select name="role" defaultValue={cleaned.role ?? ""} className={filterControlClass}>
            <option value="">Todos</option>
            {Object.values(UserRole).map((r) => (
              <option key={r} value={r}>
                {USER_ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>

      <TableCard minWidth="46rem">
        <THead>
          <Th>Nome</Th>
          <Th>E-mail</Th>
          <Th width="7.5rem">Órgão</Th>
          <Th width="10.5rem">Perfil</Th>
          <Th width="11.5rem">Status</Th>
          <ChevronTh />
        </THead>
        <TBody>
          {items.length === 0 && <EmptyRow colSpan={6}>Nenhuma conta com esses filtros.</EmptyRow>}
          {items.map((u) => {
            const user = toPublicUser(u);
            const agencyShort = user.agency?.split(" - ")[0] ?? null;
            return (
              <Tr key={user.id} clickable>
                <Td truncate>
                  <RowLink
                    href={`/admin/usuarios/${user.id}`}
                    className="font-medium text-gray-900"
                  >
                    {user.fullName}
                  </RowLink>
                </Td>
                <Td truncate className="text-gray-500">
                  {user.email}
                </Td>
                <Td title={user.agency ?? undefined}>{agencyShort ?? <Muted>—</Muted>}</Td>
                <Td>
                  {USER_ROLE_LABEL[user.role]}
                  {user.isDriver && <Muted> · Condutor</Muted>}
                </Td>
                <Td>
                  {user.passwordResetRequestedAt && user.status === "ACTIVE" ? (
                    <Badge tone="warning">Pediu nova senha</Badge>
                  ) : (
                    <UserStatusBadge status={user.status} />
                  )}
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
