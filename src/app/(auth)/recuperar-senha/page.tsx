"use client";

import { useState } from "react";
import Link from "next/link";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { apiPost } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const result = await apiPost<{ message: string }>("/api/auth/forgot-password", {
      email: f.get("email"),
    });
    setLoading(false);
    // Resposta sempre genérica (anti-enumeração).
    setMessage(
      result.ok
        ? result.data.message
        : "Se houver uma conta para este e-mail, enviaremos instruções.",
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-institutional-900">Recuperar senha</h1>
        <p className="mt-1 text-sm text-gray-500">
          Informe seu e-mail institucional para receber o link de redefinição.
        </p>
      </div>

      {message ? (
        <Alert tone="success">{message}</Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field
            label="E-mail institucional"
            name="email"
            type="email"
            placeholder="nome@seplag.mt.gov.br"
            required
          />
          <Button type="submit" loading={loading} className="w-full">
            Enviar instruções
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-gray-600">
        <Link href="/login" className="font-medium text-institutional-700 hover:underline">
          Voltar ao login
        </Link>
      </p>
    </div>
  );
}
