"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { PasswordField } from "@/components/ui/password-field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { apiGet, apiPost } from "@/lib/api-client";
import { EMAIL_DELIVERY_ENABLED } from "@/shared/features";

type FieldErrors = Record<string, string[]>;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [done, setDone] = useState(false);
  // Órgãos atendidos pela central; vazio enquanto a central não cadastrar nenhum.
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    void apiGet<{ agencies: { id: string; name: string }[] }>("/api/agencies").then((r) => {
      if (r.ok) setAgencies(r.data.agencies);
    });
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const f = new FormData(e.currentTarget);
    const result = await apiPost("/api/auth/register", {
      fullName: f.get("fullName"),
      cpf: f.get("cpf"),
      registrationNumber: f.get("registrationNumber"),
      email: f.get("email"),
      phone: f.get("phone"),
      sector: f.get("sector"),
      department: f.get("department"),
      agency: f.get("agency") || null,
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

  if (done) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-institutional-900">
          {EMAIL_DELIVERY_ENABLED ? "Confirme seu e-mail" : "Cadastro enviado"}
        </h1>
        <Alert tone="success">
          {EMAIL_DELIVERY_ENABLED
            ? "Cadastro recebido. Enviamos um e-mail de confirmação para o endereço institucional informado. Sua conta será ativada após a confirmação. Se o e-mail não chegar, a SATGF pode liberar seu acesso."
            : "Seu cadastro foi enviado para a SATGF. Assim que ele for aprovado, você já consegue entrar com seu e-mail e senha."}
        </Alert>
        <Link href="/login" className="text-sm font-medium text-institutional-700 hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-institutional-900">Criar conta</h1>
        <p className="mt-1 text-sm text-gray-500">Use o e-mail institucional do seu órgão.</p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nome completo" name="fullName" errors={fieldErrors.fullName} required />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="CPF"
            name="cpf"
            inputMode="numeric"
            placeholder="000.000.000-00"
            errors={fieldErrors.cpf}
            required
          />
          <Field
            label="Matrícula"
            name="registrationNumber"
            errors={fieldErrors.registrationNumber}
            required
          />
        </div>
        <Field
          label="E-mail institucional"
          name="email"
          type="email"
          placeholder="nome@orgao.mt.gov.br"
          errors={fieldErrors.email}
          required
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Telefone"
            name="phone"
            type="tel"
            placeholder="(65) 90000-0000"
            errors={fieldErrors.phone}
            required
          />
          <Field label="Setor" name="sector" errors={fieldErrors.sector} required />
        </div>
        {agencies.length > 0 && (
          <Select label="Órgão" name="agency" defaultValue="" errors={fieldErrors.agency} required>
            <option value="" disabled>
              Selecione…
            </option>
            {agencies.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </Select>
        )}
        <Field label="Lotação" name="department" errors={fieldErrors.department} required />
        <PasswordField
          label="Senha"
          name="password"
          autoComplete="new-password"
          hint="Mínimo 10 caracteres, com maiúscula, minúscula, número e símbolo."
          errors={fieldErrors.password}
          required
        />
        <PasswordField
          label="Confirmar senha"
          name="confirmPassword"
          autoComplete="new-password"
          errors={fieldErrors.confirmPassword}
          required
        />
        <Button type="submit" loading={loading} className="w-full">
          Cadastrar
        </Button>
      </form>

      <p className="text-center text-sm text-gray-600">
        Já possui conta?{" "}
        <Link href="/login" className="font-medium text-institutional-700 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
