"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { apiPost } from "@/lib/api-client";
import { joinLicenseCategory, splitLicenseCategory } from "./license-category";

/**
 * A CNH tem uma categoria de veículo (cada uma inclui as anteriores: D já
 * habilita C e B) e, opcionalmente, a A de moto. O valor salvo continua o da
 * CNH impressa: "B", "AD", "AE"...
 */
const VEHICLE_CATEGORIES = [
  { value: "B", hint: "Carros" },
  { value: "C", hint: "Caminhões" },
  { value: "D", hint: "Ônibus e vans" },
  { value: "E", hint: "Carretas" },
] as const;

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
  const initial = splitLicenseCategory(props.driverLicenseCategory);
  const [mainCategory, setMainCategory] = useState(initial.main);
  const [moto, setMoto] = useState(initial.moto);
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
      driverLicenseCategory: joinLicenseCategory(mainCategory, moto) || null,
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
        <div className="space-y-4">
          <fieldset>
            <legend className="text-sm font-medium text-gray-700">
              Categoria da CNH
              <span aria-hidden="true" className="ml-0.5 text-danger">
                *
              </span>
            </legend>
            <p className="mt-0.5 text-xs text-gray-500">
              Marque a categoria da CNH. Cada uma já inclui as anteriores (D habilita C e B).
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {VEHICLE_CATEGORIES.map((c) => (
                <label key={c.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="driverLicenseMainCategory"
                    value={c.value}
                    checked={mainCategory === c.value}
                    onChange={() => setMainCategory(c.value)}
                    aria-label={`Categoria ${c.value} (${c.hint.toLowerCase()})`}
                    className="peer sr-only"
                  />
                  <span className="flex flex-col items-center rounded-md border-2 border-gray-200 bg-white px-3 py-2 text-center transition hover:border-institutional-300 peer-checked:border-institutional-700 peer-checked:bg-institutional-50 peer-focus-visible:ring-2 peer-focus-visible:ring-institutional-500 peer-focus-visible:ring-offset-1">
                    <span className="text-lg font-bold text-gray-900">{c.value}</span>
                    <span className="text-xs text-gray-600">{c.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={moto}
                onChange={(e) => setMoto(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Também tem categoria A (moto)
            </label>
            {fieldErrors.driverLicenseCategory && (
              <p className="mt-1 text-xs text-danger">{fieldErrors.driverLicenseCategory[0]}</p>
            )}
          </fieldset>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
