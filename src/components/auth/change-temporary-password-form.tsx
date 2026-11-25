"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordField } from "@/components/ui/password-field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { apiPost } from "@/lib/api-client";
import { PASSWORD_MIN_LENGTH } from "@/shared/validation/password";

type FieldErrors = Record<string, string[] | undefined>;

export function ChangeTemporaryPasswordForm({
  firstName,
  home,
}: {
  firstName: string;
  home: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});
    const f = new FormData(e.currentTarget);
    const result = await apiPost("/api/auth/change-password", {
      password: f.get("password"),
      confirmPassword: f.get("confirmPassword"),
    });
    setLoading(false);
    if (result.ok) {
      router.push(home);
      router.refresh();
      return;
    }
    if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
    setError(result.error.message);
  }

  async function logout() {
    await apiPost("/api/auth/logout", {});
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-institutional-900">Defina uma senha nova</h1>
        <p className="mt-1 text-sm text-gray-500">
          {firstName ? `${firstName}, você` : "Você"} entrou com a senha provisória gerada pela
          SATGF. Para continuar, crie a sua senha.
        </p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <form onSubmit={onSubmit} className="space-y-4">
        <PasswordField
          label="Nova senha"
          name="password"
          autoComplete="new-password"
          hint={`Ao menos ${PASSWORD_MIN_LENGTH} caracteres, com maiúscula, minúscula, número e símbolo.`}
          errors={fieldErrors.password}
          required
        />
        <PasswordField
          label="Confirmar nova senha"
          name="confirmPassword"
          autoComplete="new-password"
          errors={fieldErrors.confirmPassword}
          required
        />
        <Button type="submit" loading={loading} className="w-full">
          Salvar e continuar
        </Button>
      </form>

      <p className="text-center text-sm text-gray-600">
        <button
          type="button"
          onClick={logout}
          className="font-medium text-institutional-700 hover:underline"
        >
          Sair
        </button>
      </p>
    </div>
  );
}
