import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Tabela padrão das listas. Cada célula tem uma linha só; o que não cabe é
 * cortado com reticências (o texto completo fica no detalhe). Linhas com
 * `RowLink` são clicáveis por inteiro e terminam com uma seta.
 */
export function TableCard({
  minWidth = "44rem",
  children,
}: {
  minWidth?: string;
  children: React.ReactNode;
}) {
  return (
    // `relative`: o que for posicionado dentro da tabela fica preso à rolagem
    // dela e não alarga a página.
    <div className="relative overflow-x-auto rounded-card border border-gray-200 bg-white shadow-card">
      {/* Layout fixo: colunas curtas têm largura definida no cabeçalho e as de
          texto dividem o resto, cortando com reticências. Assim a tabela cabe
          na tela em vez de rolar para o lado. */}
      <table className="w-full table-fixed text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

/** Cabeçalho vazio da coluna da seta (largura fixa). */
export function ChevronTh() {
  return (
    <Th width="2.75rem">
      <span className="sr-only">Abrir</span>
    </Th>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-gray-200 bg-gray-50/80">
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({
  children,
  align = "left",
  className,
  width,
}: {
  children?: React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  /** Largura fixa da coluna (ex.: "7rem"). Sem ela, a coluna divide o resto. */
  width?: string;
}) {
  return (
    <th
      scope="col"
      style={width ? { width } : undefined}
      className={cn(
        "whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-gray-100">{children}</tbody>;
}

export function Tr({
  clickable = false,
  muted = false,
  children,
}: {
  clickable?: boolean;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <tr
      className={cn(
        "transition-colors",
        clickable && "group relative cursor-pointer hover:bg-institutional-50/40",
        muted && "text-gray-400",
      )}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  align = "left",
  className,
  title,
  truncate = false,
}: {
  children?: React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  /** Texto completo ao passar o mouse, quando a célula corta. */
  title?: string;
  /** Corta o excesso com reticências (o texto completo fica no `title`). */
  truncate?: boolean;
}) {
  return (
    <td
      title={title}
      className={cn(
        "whitespace-nowrap px-4 py-3.5 align-middle text-gray-700",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      {truncate ? <div className="truncate">{children}</div> : children}
    </td>
  );
}

/** Link principal da linha: o clique em qualquer parte da linha leva a ele. */
export function RowLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-institutional-500",
        className,
      )}
    >
      {children}
    </Link>
  );
}

/**
 * Código público nas listas: só a parte final, que já identifica o registro
 * (o código completo aparece ao passar o mouse e no detalhe).
 */
export function CodeText({ code }: { code: string }) {
  return (
    <span
      title={code}
      className="font-mono text-[12.5px] font-semibold tracking-tight text-institutional-800"
    >
      {code.split("-").pop()}
    </span>
  );
}

/** Seta no fim da linha clicável. */
export function ChevronCell() {
  return (
    <td className="px-3 py-3.5 text-right align-middle">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="ml-auto h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-institutional-600"
      >
        <path d="m9 6 6 6-6 6" />
      </svg>
    </td>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center text-sm text-gray-500">
        {children}
      </td>
    </tr>
  );
}

/** Texto secundário dentro de uma célula (ex.: placa ao lado do modelo). */
export function Muted({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
  return <span className={cn("text-gray-400", mono && "font-mono text-xs")}>{children}</span>;
}

/**
 * Versão para celular das listas: um cartão tocável por item, com o mesmo
 * conteúdo essencial da tabela (código, situação, título e uma linha extra).
 */
export function MobileCard({
  href,
  code,
  badge,
  title,
  subtitle,
}: {
  href: string;
  code: string;
  badge: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded-card border border-gray-200 bg-white p-4 shadow-card transition-colors active:bg-gray-50"
      >
        <div className="flex items-center justify-between gap-3">
          <CodeText code={code} />
          <span className="shrink-0">{badge}</span>
        </div>
        <p className="mt-2 truncate text-sm font-medium text-gray-900">{title}</p>
        {subtitle && <p className="mt-0.5 truncate text-xs text-gray-500">{subtitle}</p>}
      </Link>
    </li>
  );
}
