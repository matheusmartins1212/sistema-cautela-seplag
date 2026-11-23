"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api-client";

export function LogoutButton({ appearance = "button" }: { appearance?: "button" | "sidebar" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    await apiPost("/api/auth/logout");
    router.push("/login");
    router.refresh();
  }

  if (appearance === "sidebar") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-institutional-100 transition-colors hover:bg-institutional-800/60 hover:text-white disabled:opacity-60"
      >
        <LogoutIcon />
        {loading ? "Saindo…" : "Sair"}
      </button>
    );
  }

  return (
    <Button variant="secondary" loading={loading} onClick={onClick}>
      Sair
    </Button>
  );
}

function LogoutIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
