import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Peças das telas de detalhe. Todas seguem o mesmo modelo:
 * cabeçalho (voltar, título legível, código curto, situação, uma linha de
 * contexto e as ações principais à direita), conteúdo principal à esquerda e
 * uma coluna lateral com pessoas, vínculos e gestão.
 */

export function DetailHeader({
  backHref,
  backLabel,
  title,
  code,
  codeTitle,
  badges,
  meta,
  actions,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  /** Código curto ou placa, mostrado ao lado do título. */
  code?: string;
  /** Texto ao passar o mouse no código (ex.: o código completo). */
  codeTitle?: string;
  badges?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm font-medium text-institutional-700 hover:text-institutional-900"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-4 w-4"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        {backLabel}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-institutional-900">{title}</h1>
            {code && (
              <span
                title={codeTitle}
                data-detail-code
                className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-200"
              >
                {code}
              </span>
            )}
            {badges}
          </div>
          {meta && <p className="mt-1.5 text-sm text-gray-500">{meta}</p>}
        </div>
        {actions && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/** Conteúdo principal (2/3) e coluna lateral (1/3) no computador; uma coluna no celular. */
export function DetailLayout({ main, aside }: { main: React.ReactNode; aside?: React.ReactNode }) {
  if (!aside) return <div className="space-y-6">{main}</div>;
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
      <div className="min-w-0 space-y-6 lg:col-span-2">{main}</div>
      <div className="min-w-0 space-y-6">{aside}</div>
    </div>
  );
}

const CARD_TONE = {
  default: "border-gray-200 bg-white",
  success: "border-emerald-200 bg-emerald-50/40",
  warning: "border-amber-200 bg-amber-50/50",
  danger: "border-red-200 bg-red-50/40",
  highlight: "border-institutional-200 bg-white ring-1 ring-institutional-100",
} as const;

/** Bloco das telas de detalhe: título, descrição curta opcional e conteúdo. */
export function DetailCard({
  title,
  description,
  action,
  tone = "default",
  flush = false,
  id,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  /** Link ou contagem à direita do título. */
  action?: React.ReactNode;
  tone?: keyof typeof CARD_TONE;
  /** Sem espaçamento interno no corpo (listas que vão de ponta a ponta). */
  flush?: boolean;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={title}
      className={cn("scroll-mt-6 rounded-card border shadow-card", CARD_TONE[tone])}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 border-b border-gray-100 px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
        </div>
        {action && <div className="shrink-0 text-xs text-gray-500">{action}</div>}
      </div>
      <div className={flush ? "" : "px-5 py-4"}>{children}</div>
    </section>
  );
}

/** Grade de rótulo e valor. */
export function Facts({
  children,
  columns = 2,
}: {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-1 gap-x-6 gap-y-4",
        columns >= 2 && "sm:grid-cols-2",
        columns === 3 && "lg:grid-cols-3",
      )}
    >
      {children}
    </dl>
  );
}

export function Fact({
  label,
  children,
  note,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  /** Linha menor abaixo do valor (ex.: horário efetivo). */
  note?: React.ReactNode;
  /** Ocupa a linha inteira (textos longos). */
  wide?: boolean;
}) {
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-full")}>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line break-words text-sm font-medium text-gray-900">
        {children}
      </dd>
      {note && <dd className="mt-0.5 text-xs text-gray-500">{note}</dd>}
    </div>
  );
}

/** Lista compacta de pessoas e registros ligados (solicitante, condutor, veículo...). */
export function RelatedList({ children }: { children: React.ReactNode }) {
  return <ul className="-my-1 divide-y divide-gray-100">{children}</ul>;
}

export function RelatedItem({
  label,
  title,
  detail,
  href,
  badge,
}: {
  label: string;
  title: React.ReactNode;
  detail?: React.ReactNode;
  href?: string;
  badge?: React.ReactNode;
}) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p
          className={cn(
            "mt-0.5 break-words text-sm font-medium text-gray-900",
            href && "group-hover:text-institutional-800",
          )}
        >
          {title}
        </p>
        {detail && <div className="mt-0.5 text-xs text-gray-500">{detail}</div>}
      </div>
      {badge && <div className="shrink-0">{badge}</div>}
      {href && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-institutional-600"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      )}
    </>
  );
  return (
    <li>
      {href ? (
        <Link
          href={href}
          className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-gray-50"
        >
          {body}
        </Link>
      ) : (
        <div className="flex items-center gap-3 py-2.5">{body}</div>
      )}
    </li>
  );
}

/** Classe do botão secundário em forma de link (ex.: "Editar"). */
export const secondaryLinkClass =
  "inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-50";
