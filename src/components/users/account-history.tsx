import Link from "next/link";
import { listAccountHistory } from "@/server/modules/audit/audit-history.service";
import {
  AUDIT_ACTION_LABEL,
  AUDIT_GROUPS,
  auditGroupOf,
  describeAudit,
} from "@/shared/audit-catalog";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 20;

const GROUP_TONE: Record<string, string> = {
  acesso: "bg-gray-100 text-gray-700",
  contas: "bg-violet-50 text-violet-700",
  solicitacoes: "bg-institutional-50 text-institutional-800",
  viagens: "bg-emerald-50 text-emerald-700",
  veiculos: "bg-amber-50 text-amber-800",
  orgaos: "bg-sky-50 text-sky-700",
};

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Cuiaba",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/**
 * Histórico de ações da conta, no perfil dela: quem fez é sempre esta conta,
 * então a tabela mostra só quando, o quê e onde. Só leitura.
 */
export async function AccountHistory({
  userId,
  basePath,
  group,
  page,
}: {
  userId: string;
  basePath: string;
  group?: string;
  page: number;
}) {
  const validGroup = group && AUDIT_GROUPS.some((g) => g.key === group) ? group : undefined;
  const { items, total } = await listAccountHistory(userId, {
    group: validGroup,
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const href = (g: string | undefined, p: number) => {
    const qs = new URLSearchParams();
    if (g) qs.set("acoes", g);
    if (p > 1) qs.set("pagina", String(p));
    const s = qs.toString();
    return `${basePath}${s ? `?${s}` : ""}#historico`;
  };

  return (
    <section
      id="historico"
      className="scroll-mt-6 rounded-card border border-gray-200 bg-white shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Histórico de ações</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            O que esta conta fez no sistema. Os registros não podem ser editados nem apagados.
          </p>
        </div>
        <span className="text-xs text-gray-500">
          {total} {total === 1 ? "registro" : "registros"}
        </span>
      </div>

      <nav aria-label="Filtrar ações" className="flex flex-wrap gap-1.5 px-5 pt-4">
        <FilterChip href={href(undefined, 1)} active={!validGroup} label="Todas" />
        {AUDIT_GROUPS.map((g) => (
          <FilterChip
            key={g.key}
            href={href(g.key, 1)}
            active={validGroup === g.key}
            label={g.label}
          />
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-gray-500">
          {validGroup ? "Nenhuma ação deste tipo." : "Nenhuma ação registrada ainda."}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100">
          {items.map((it) => {
            const g = auditGroupOf(it.action);
            const detail = describeAudit(it.action, it.metadata);
            return (
              <li
                key={it.id}
                className="grid grid-cols-1 gap-1 px-5 py-3 text-sm sm:grid-cols-[10.5rem_13rem_minmax(0,1fr)] sm:gap-4"
              >
                <span className="tabular-nums text-gray-600">
                  {dateTime.format(it.createdAt).replace(",", "")}
                </span>
                <span>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                      GROUP_TONE[g?.key ?? "acesso"],
                    )}
                  >
                    {AUDIT_ACTION_LABEL[it.action]}
                  </span>
                </span>
                <span className="min-w-0 text-gray-700">
                  {it.target &&
                    (it.target.href ? (
                      <Link
                        href={it.target.href}
                        className="font-medium text-institutional-700 hover:underline"
                      >
                        {it.target.label}
                      </Link>
                    ) : (
                      <span className="font-medium">{it.target.label}</span>
                    ))}
                  {it.target && detail && <span className="text-gray-400"> · </span>}
                  {detail}
                  {!it.target && !detail && !it.ipAddress && (
                    <span className="text-gray-400">—</span>
                  )}
                  {it.ipAddress && (
                    <span
                      className={cn(
                        "font-mono text-[11px] text-gray-400",
                        (it.target || detail) && "ml-2",
                      )}
                    >
                      IP {it.ipAddress}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-sm">
          <span className="text-gray-600">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={href(validGroup, page - 1)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50"
              >
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={href(validGroup, page + 1)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50"
              >
                Próxima
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition",
        active
          ? "border-institutional-700 bg-institutional-700 text-white"
          : "border-gray-200 text-gray-600 hover:border-institutional-300 hover:text-institutional-800",
      )}
    >
      {label}
    </Link>
  );
}
