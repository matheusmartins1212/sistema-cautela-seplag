"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { apiPost } from "@/lib/api-client";
import { VEHICLE_CATEGORY_LABEL, VEHICLE_USAGE_LABEL } from "./labels";
import type { PublicVehicle } from "@/server/modules/vehicles/vehicle.dto";

type FieldErrors = Record<string, string[]>;
type Mode = "create" | "edit";

interface Props {
  mode: Mode;
  initial?: PublicVehicle;
}

interface ApiResponse {
  vehicle: PublicVehicle;
}

async function patch(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
  const json = await res.json().catch(() => null);
  return json as
    | { ok: true; data: ApiResponse }
    | { ok: false; error: { code: string; message: string; fieldErrors?: FieldErrors } };
}

export function VehicleForm({ mode, initial }: Props) {
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
    const mileageRaw = f.get("currentMileage");
    const payload: Record<string, unknown> = {
      brand: f.get("brand"),
      model: f.get("model"),
      plate: f.get("plate"),
      internalCode: f.get("internalCode") || null,
      category: f.get("category"),
      usageType: f.get("usageType"),
      linkedSector: f.get("linkedSector") || null,
      agency: f.get("agency") || null,
      currentMileage:
        typeof mileageRaw === "string" && mileageRaw.length > 0 ? Number(mileageRaw) : 0,
      notes: f.get("notes") || null,
    };

    const result =
      mode === "create"
        ? await apiPost<ApiResponse>("/api/admin/vehicles", payload)
        : await patch(`/api/admin/vehicles/${initial!.id}`, payload);

    setLoading(false);

    if (result.ok) {
      const id = result.data.vehicle.id;
      router.push(`/admin/veiculos/${id}`);
      router.refresh();
      return;
    }
    if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
    setError(result.error.message);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Marca"
          name="brand"
          defaultValue={initial?.brand}
          errors={fieldErrors.brand}
          required
        />
        <Field
          label="Modelo"
          name="model"
          defaultValue={initial?.model}
          errors={fieldErrors.model}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Placa"
          name="plate"
          placeholder="AAA0A00 ou AAA0000"
          defaultValue={initial?.plate}
          errors={fieldErrors.plate}
          required
          autoCapitalize="characters"
          style={{ textTransform: "uppercase" }}
        />
        <Field
          label="Código interno"
          name="internalCode"
          defaultValue={initial?.internalCode ?? ""}
          errors={fieldErrors.internalCode}
          hint="Opcional"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Categoria"
          name="category"
          defaultValue={initial?.category ?? ""}
          errors={fieldErrors.category}
          required
        >
          <option value="" disabled>
            Selecione…
          </option>
          {Object.entries(VEHICLE_CATEGORY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          label="Tipo de uso"
          name="usageType"
          defaultValue={initial?.usageType ?? ""}
          errors={fieldErrors.usageType}
          required
        >
          <option value="" disabled>
            Selecione…
          </option>
          {Object.entries(VEHICLE_USAGE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Setor vinculado"
          name="linkedSector"
          defaultValue={initial?.linkedSector ?? ""}
          errors={fieldErrors.linkedSector}
          hint="Opcional — ex.: Gabinete, Patrimônio, Planejamento"
        />
        <Field
          label="Órgão / Agência"
          name="agency"
          defaultValue={initial?.agency ?? ""}
          errors={fieldErrors.agency}
          hint="Opcional"
        />
      </div>

      <Field
        label="Quilometragem atual"
        name="currentMileage"
        type="number"
        min={0}
        step={1}
        defaultValue={initial?.currentMileage ?? 0}
        errors={fieldErrors.currentMileage}
      />

      <Textarea
        label="Observações administrativas"
        name="notes"
        defaultValue={initial?.notes ?? ""}
        errors={fieldErrors.notes}
        hint="Visível apenas para administradores."
        rows={3}
      />

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {mode === "create" ? "Cadastrar veículo" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
