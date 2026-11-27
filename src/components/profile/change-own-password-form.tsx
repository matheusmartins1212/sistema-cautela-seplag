"use client";

import { useRef, useState } from "react";
import { PasswordField } from "@/components/ui/password-field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { apiPost } from "@/lib/api-client";
import { PASSWORD_MIN_LENGTH } from "@/shared/validation/password";

type FieldErrors = Record<string, string[] | undefined>;

/** Bloco "Senha" do perfil: troca da própria senha, com a senha atual. */
export function ChangeOwnPasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDone(false);
    setFieldErrors({});
    const f = new FormData(e.currentTarget);
    const result = await apiPost("/api/auth/password", {
      currentPassword: f.get("currentPassword"),
      password: f.get("password"),
      confirmPassword: f.get("confirmPassword"),
    });
    setLoading(false);
    if (result.ok) {
      formRef.current?.reset();
      setDone(true);
      return;
    }
    if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
    setError(result.error.message);
  }

  return (
    <section
      aria-label="Senha"
      className="overflow-hidden rounded-card border border-gray-200 bg-white shadow-card"
    >
      <div className="border-b border-gray-100 px-6 py-3.5">
        <h2 className="text-sm font-semibold text-gray-900">Senha</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Ao trocar, os outros dispositivos conectados à sua conta saem do sistema.
        </p>
      </div>
      <form ref={formRef} onSubmit={onSubmit} className="space-y-4 px-6 py-5">
        {done && <Alert tone="success">Senha alterada.</Alert>}
        {error && <Alert tone="error">{error}</Alert>}
        <PasswordField
          label="Senha atual"
          name="currentPassword"
          autoComplete="current-password"
          errors={fieldErrors.currentPassword}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={loading}>
            Salvar nova senha
          </Button>
        </div>
      </form>
    </section>
  );
}
