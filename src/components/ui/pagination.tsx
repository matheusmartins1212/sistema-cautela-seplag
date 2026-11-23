import Link from "next/link";

/** Paginação padrão: "Página X de Y" e os botões Anterior/Próxima. */
export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const btn =
    "inline-flex h-9 items-center rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50";
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between text-sm">
      <span className="text-gray-500">
        Página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={hrefFor(page - 1)} className={btn}>
            Anterior
          </Link>
        )}
        {page < totalPages && (
          <Link href={hrefFor(page + 1)} className={btn}>
            Próxima
          </Link>
        )}
      </div>
    </nav>
  );
}
