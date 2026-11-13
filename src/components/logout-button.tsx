"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api-client";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    await apiPost("/api/auth/logout");
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="secondary" loading={loading} onClick={onClick}>
      Sair
    </Button>
  );
}
