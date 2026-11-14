"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Field } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { apiPost } from "@/lib/api-client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Só aceita caminhos internos, para o link de login não virar um redirecionamento
  // para fora do sistema.
  const rawNext = params.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNeedsConfirmation(false);

    const form = new FormData(e.currentTarget);
    const result = await apiPost<{ user: { role: string } }>("/api/auth/login", {
      email: form.get("email"),
      password: form.get("password"),
    });

    setLoading(false);
    if (result.ok) {
      const isAdminRole =
        result.data.user.role === "ADMIN" || result.data.user.role === "SUPER_ADMIN";
      router.push(next ?? (isAdminRole ? "/admin" : "/painel"));
      router.refresh();
      return;
    }
    if (result.error.code === "EMAIL_NOT_VERIFIED") {
      setNeedsConfirmation(true);
      return;
    }
    setError(result.error.message);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-institutional-900">Acessar plataforma</h1>
        <p className="mt-1 text-sm text-gray-500">Entre com seu e-mail institucional e senha.</p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {needsConfirmation && (
        <Alert tone="warning">
          Sua conta ainda não foi confirmada. Verifique seu e-mail institucional ou peça à SATGF
          para liberar seu acesso.
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label="E-mail institucional"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nome@orgao.mt.gov.br"
          required
        />
        <PasswordField label="Senha" name="password" autoComplete="current-password" required />
        <div className="text-right">
          <Link href="/recuperar-senha" className="text-sm text-institutional-700 hover:underline">
            Esqueci minha senha
          </Link>
        </div>
        <Button type="submit" loading={loading} className="w-full">
          Entrar
        </Button>
      </form>

      <p className="text-center text-sm text-gray-600">
        Não possui cadastro?{" "}
        <Link href="/cadastro" className="font-medium text-institutional-700 hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
