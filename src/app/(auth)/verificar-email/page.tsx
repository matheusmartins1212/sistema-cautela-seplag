"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api-client";

type State = "verifying" | "success" | "error";

function VerifyEmail() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("verifying");
  const [message, setMessage] = useState("Confirmando seu e-mail...");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // evita dupla execução em StrictMode
    ran.current = true;

    if (!token) {
      setState("error");
      setMessage("Link inválido: token ausente.");
      return;
    }
    apiPost<{ message: string }>("/api/auth/verify-email", { token }).then((r) => {
      if (r.ok) {
        setState("success");
        setMessage(r.data.message);
      } else {
        setState("error");
        setMessage(r.error.message);
      }
    });
  }, [token]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-institutional-900">Confirmação de e-mail</h1>

      {state === "verifying" && <Alert tone="info">{message}</Alert>}
      {state === "success" && <Alert tone="success">{message}</Alert>}
      {state === "error" && <Alert tone="error">{message}</Alert>}

      {state === "success" && (
        <Link href="/login">
          <Button className="w-full">Ir para o login</Button>
        </Link>
      )}
      {state === "error" && (
        <p className="text-sm text-gray-600">
          O link pode ter expirado.{" "}
          <Link href="/login" className="font-medium text-institutional-700 hover:underline">
            Voltar ao login
          </Link>
        </p>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Alert tone="info">Carregando...</Alert>}>
      <VerifyEmail />
    </Suspense>
  );
}
