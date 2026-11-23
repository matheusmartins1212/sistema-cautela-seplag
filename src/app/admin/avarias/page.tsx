import { DamageSeverity, DamageStatus } from "@prisma/client";
import { listDamages } from "@/server/modules/damages/damage.service";
import { listDamagesQuerySchema } from "@/server/modules/damages/damage.schemas";
import { toPublicDamage } from "@/server/modules/damages/damage.dto";
import { DamageStatusBadge } from "@/components/damages/damage-status-badge";
import { SeverityBadge } from "@/components/damages/severity-badge";
import { DamageActions } from "@/components/damages/damage-actions";
import { DAMAGE_STATUS_LABEL, SEVERITY_LABEL } from "@/components/damages/labels";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar, FilterField, filterControlClass } from "@/components/ui/filter-bar";
import { EmptyRow, TBody, THead, TableCard, Td, Th, Tr } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { formatInstantBr } from "@/shared/time";
import { countLabel } from "@/shared/format";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminAvariasPage({ searchParams }: Props) {
  const raw = await searchParams;
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.length > 0) cleaned[k] = v;
  }

  const query = listDamagesQuerySchema.parse(cleaned);
  const { items, total, page, pageSize } = await listDamages(query);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pageHref = (n: number) => {
    const p = new URLSearchParams(cleaned);
    p.set("page", String(n));
    return `/admin/avarias?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Avarias" description={countLabel(total, "avaria", "avarias")} />

      <FilterBar clearHref="/admin/avarias">
        <FilterField label="Status">
          <select name="status" defaultValue={cleaned.status ?? ""} className={filterControlClass}>
            <option value="">Todos</option>
            {Object.values(DamageStatus).map((s) => (
              <option key={s} value={s}>
                {DAMAGE_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Severidade">
          <select
            name="severity"
            defaultValue={cleaned.severity ?? ""}
            className={filterControlClass}
          >
            <option value="">Todas</option>
            {Object.values(DamageSeverity).map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABEL[s]}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>

      <TableCard minWidth="46rem">
        <THead>
          <Th>Veículo</Th>
          <Th>Descrição</Th>
          <Th width="8rem">Severidade</Th>
          <Th width="9.5rem">Status</Th>
          <Th width="8.5rem">Registrada em</Th>
          <Th width="7rem">
            <span className="sr-only">Ações</span>
          </Th>
        </THead>
        <TBody>
          {items.length === 0 && <EmptyRow colSpan={6}>Nenhuma avaria com esses filtros.</EmptyRow>}
          {items.map((d) => {
            const dmg = toPublicDamage(d, { includeVehicle: true });
            const vehicleLabel = dmg.vehicle
              ? `${dmg.vehicle.brand} ${dmg.vehicle.model} · ${dmg.vehicle.plateFormatted}`
              : "Veículo";
            return (
              <Tr key={dmg.id}>
                <Td
                  truncate
                  className="font-medium text-gray-900"
                  title={
                    dmg.vehicle ? `${dmg.vehicle.model} · ${dmg.vehicle.plateFormatted}` : undefined
                  }
                >
                  {dmg.vehicle?.model ?? "—"}
                </Td>
                <Td truncate title={dmg.description}>
                  {dmg.description}
                </Td>
                <Td>
                  <SeverityBadge severity={dmg.severity} />
                </Td>
                <Td>
                  <DamageStatusBadge status={dmg.status} />
                </Td>
                <Td className="tabular-nums text-gray-500">
                  {formatInstantBr(dmg.createdAt).slice(0, 10)}
                </Td>
                <Td align="right">
                  <DamageActions
                    damageId={dmg.id}
                    status={dmg.status}
                    severity={dmg.severity}
                    description={dmg.description}
                    vehicleLabel={vehicleLabel}
                    checklistId={dmg.checklistId}
                    cautionId={dmg.cautionId}
                  />
                </Td>
              </Tr>
            );
          })}
        </TBody>
      </TableCard>

      <Pagination page={page} totalPages={totalPages} hrefFor={pageHref} />
    </div>
  );
}
