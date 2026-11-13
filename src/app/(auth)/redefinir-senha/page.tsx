"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { apiPost } from "@/lib/api-client";

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const f = new FormData(e.currentTarget);
    const result = await apiPost("/api/auth/reset-password", {
      token,
      password: f.get("password"),
      confirmPassword: f.get("confirmPassword"),
    });

    setLoading(false);
    if (result.ok) {
      setDone(true);
      return;
    }
    if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
    setError(result.error.message);
  }

  if (!token) {
    return <Alert tone="error">Link inválido: token ausente.</Alert>;
  }

  if (done) {
    return (
      <div className="space-y-4">
        <Alert tone="success">
          Senha redefinida com sucesso. Por segurança, as demais sessões foram encerradas.
        </Alert>
        <Link href="/login">
          <Button className="w-full">Fazer login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-institutional-900">Redefinir senha</h1>
        <p className="mt-1 text-sm text-gray-500">Crie uma nova senha forte.</p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label="Nova senha"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="Mínimo 10 caracteres, com maiúscula, minúscula, número e símbolo."
          errors={fieldErrors.password}
          required
        />
        <Field
          label="Confirmar nova senha"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          errors={fieldErrors.confirmPassword}
          required
        />
        <Button type="submit" loading={loading} className="w-full">
          Redefinir senha
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Alert tone="info">Carregando...</Alert>}>
      <ResetForm />
    </Suspense>
  );
}
