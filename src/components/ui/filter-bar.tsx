import Link from "next/link";
import { cn } from "@/lib/cn";

/** Campo de texto, data ou seleção dentro da barra de filtros. */
export const filterControlClass =
  "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-institutional-500 focus:outline-none focus:ring-2 focus:ring-institutional-500/20";

/**
 * Barra de filtros padrão: campos em linha e, no fim, "Limpar" e "Filtrar".
 * Usa GET, então os filtros ficam no endereço e sobrevivem a recarregar.
 */
export function FilterBar({
  clearHref,
  submitLabel = "Filtrar",
  children,
}: {
  clearHref: string;
  submitLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <form className="flex flex-wrap items-end gap-3 rounded-card border border-gray-200 bg-white p-4 shadow-card">
      {children}
      <div className="ml-auto flex items-center gap-2">
        <Link
          href={clearHref}
          className="inline-flex h-10 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Limpar
        </Link>
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-md bg-institutional-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-institutional-700"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

/** Rótulo + controle. `grow` para a busca ocupar o espaço que sobrar. */
export function FilterField({
  label,
  grow = false,
  children,
}: {
  label: string;
  grow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("text-sm", grow ? "min-w-[14rem] flex-1" : "w-full sm:w-48")}>
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}
