import { listDriversOverview } from "@/server/modules/users/user.service";
import { UserStatusBadge } from "@/components/users/user-status-badge";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
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
import { toAppWallClock } from "@/shared/time";
import { countLabel } from "@/shared/format";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

function formatDateBr(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getUTCFullYear()}`;
}

function formatDateTimeBr(date: Date): string {
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${formatDateBr(date)}, ${hh}:${mm}`;
}

/** Situação da CNH em relação a hoje (horário de Cuiabá), em poucas palavras. */
function licenseStatus(expiresAt: Date | null): { label: string; tone: BadgeTone } {
  if (!expiresAt) return { label: "Sem validade", tone: "muted" };
  const today = toAppWallClock(new Date());
  today.setUTCHours(0, 0, 0, 0);
  const days = Math.round((expiresAt.getTime() - today.getTime()) / DAY_MS);
  if (days < 0) return { label: "Vencida", tone: "danger" };
  if (days <= 30) return { label: `Vence ${formatDateBr(expiresAt)}`, tone: "warning" };
  return { label: `Até ${formatDateBr(expiresAt)}`, tone: "success" };
}

export default async function AdminCondutoresPage() {
  const drivers = await listDriversOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Condutores"
        description={`${countLabel(drivers.length, "condutor habilitado", "condutores habilitados")}. Para habilitar, abra a pessoa em Usuários.`}
      />

      <TableCard minWidth="46rem">
        <THead>
          <Th>Condutor</Th>
          <Th width="13rem">CNH</Th>
          <Th align="right" width="7rem">
            Em aberto
          </Th>
          <Th width="10.5rem">Próxima saída</Th>
          <Th width="11.5rem">Acesso</Th>
          <ChevronTh />
        </THead>
        <TBody>
          {drivers.length === 0 && (
            <EmptyRow colSpan={6}>Nenhum condutor habilitado ainda.</EmptyRow>
          )}
          {drivers.map(({ user, activeTrips, nextTripAt }) => {
            const license = licenseStatus(user.driverLicenseExpiresAt);
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
                <Td>
                  <span className="mr-2 font-semibold text-gray-900">
                    {user.driverLicenseCategory ?? "—"}
                  </span>
                  <Badge tone={license.tone}>{license.label}</Badge>
                </Td>
                <Td align="right" className="tabular-nums">
                  {activeTrips}
                </Td>
                <Td className="tabular-nums">
                  {nextTripAt ? formatDateTimeBr(nextTripAt) : <Muted>—</Muted>}
                </Td>
                <Td>
                  <UserStatusBadge status={user.status} />
                </Td>
                <ChevronCell />
              </Tr>
            );
          })}
        </TBody>
      </TableCard>
    </div>
  );
}
