"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { apiPost } from "@/lib/api-client";

const CATEGORIES = ["B", "C", "D", "E", "AB", "AC", "AD", "AE"] as const;

interface Props {
  userId: string;
  isDriver: boolean;
  driverLicenseCategory: string | null;
  driverLicenseExpiresAt: string | null; // yyyy-mm-dd
}

/**
 * Habilita o usuário como condutor da central. Só condutores aparecem na
 * escolha ao aprovar uma solicitação; a validade da CNH é conferida contra a
 * data da viagem.
 */
export function DriverProfileForm(props: Props) {
  const router = useRouter();
  const [isDriver, setIsDriver] = useState(props.isDriver);
  const [category, setCategory] = useState(props.driverLicenseCategory ?? "");
  const [expiresAt, setExpiresAt] = useState(props.driverLicenseExpiresAt ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [saved, setSaved] = useState(false);

  async function save() {
    setLoading(true);
    setError(null);
    setFieldErrors({});
    setSaved(false);
    const result = await apiPost(`/api/admin/users/${props.userId}/driver`, {
      isDriver,
      driverLicenseCategory: category || null,
      driverLicenseExpiresAt: expiresAt || null,
    });
    setLoading(false);
    if (result.ok) {
      setSaved(true);
      router.refresh();
      return;
    }
    if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
    setError(result.error.message);
  }

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={isDriver}
          onChange={(e) => setIsDriver(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300"
        />
        <span>
          <span className="font-medium text-gray-900">Condutor da central</span>
          <span className="block text-xs text-gray-500">
            Pode ser escalado para viagens e preenche os checklists de saída e retorno.
          </span>
        </span>
      </label>

      {isDriver && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Categoria da CNH"
            name="driverLicenseCategory"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            errors={fieldErrors.driverLicenseCategory}
            required
          >
            <option value="" disabled>
              Selecione…
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Field
            label="Validade da CNH"
            name="driverLicenseExpiresAt"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            errors={fieldErrors.driverLicenseExpiresAt}
            hint="Sem data, a validade não é conferida."
          />
        </div>
      )}

      {error && <Alert tone="error">{error}</Alert>}
      {saved && !error && <Alert tone="success">Perfil de condutor atualizado.</Alert>}

      <div className="flex justify-end">
        <Button onClick={save} loading={loading}>
          Salvar
        </Button>
      </div>
    </div>
  );
}
