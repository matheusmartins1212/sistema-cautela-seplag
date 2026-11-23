/** Título das telas: nome, uma linha de contexto e as ações principais. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-institutional-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Botão principal em forma de link (ex.: "Novo veículo"). */
export const primaryLinkClass =
  "inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-md bg-institutional-800 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-institutional-700";
