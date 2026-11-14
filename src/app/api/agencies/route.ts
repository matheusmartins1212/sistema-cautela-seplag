import { handleRoute, jsonOk } from "@/server/lib/http";
import { listActiveAgencies } from "@/server/modules/agencies/agency.service";

export const runtime = "nodejs";

/**
 * Órgãos ativos atendidos pela central (apenas nomes). Público porque alimenta
 * o formulário de cadastro, antes do login.
 */
export const GET = handleRoute(async () => {
  const agencies = await listActiveAgencies();
  return jsonOk({ agencies: agencies.map((a) => ({ id: a.id, name: a.name })) });
});
