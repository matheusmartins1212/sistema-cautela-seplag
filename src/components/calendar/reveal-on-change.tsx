"use client";

import { useEffect, useRef } from "react";

/**
 * Ao selecionar um dia, se o painel de cautelas estiver fora da tela (telas
 * menores, em que ele fica abaixo do calendário), rola suavemente até ele.
 * Em telas largas o painel fica ao lado do calendário e nada se mexe.
 */
export function RevealOnChange({
  watch,
  children,
  className,
}: {
  watch: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    if (!el || !watch) return;
    const rect = el.getBoundingClientRect();
    const outOfView = rect.top > window.innerHeight - 80 || rect.bottom < 0;
    if (outOfView) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }, [watch]);

  return (
    <div ref={ref} className={className} style={{ scrollMarginTop: "5rem" }}>
      {children}
    </div>
  );
}
