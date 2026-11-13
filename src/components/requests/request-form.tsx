"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Shift } from "@prisma/client";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { apiPost } from "@/lib/api-client";
import { SHIFT_LABEL } from "./labels";

type FieldErrors = Record<string, string[]>;

interface Props {
  reasons: { id: string; name: string }[];
}

interface ApiResponse {
  request: { id: string; publicCode: string };
}

const OUTRO = "Outro";

export function RequestForm({ reasons }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState<string>("");

  const reasonNeedsCustom = selectedReason === OUTRO;
  const finalReason = reasonNeedsCustom ? otherReason : selectedReason;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const f = new FormData(e.currentTarget);
    const payload = {
      withdrawalDate: f.get("withdrawalDate"),
      returnDate: f.get("returnDate"),
      shift: f.get("shift"),
      withdrawalTime: f.get("withdrawalTime"),
      returnTime: f.get("returnTime"),
      destination: f.get("destination"),
      reason: finalReason,
      termNumber: f.get("termNumber") || null,
    };

    const result = await apiPost<ApiResponse>("/api/requests", payload);
    setLoading(false);

    if (result.ok) {
      router.push(`/solicitacoes/${result.data.request.id}`);
      router.refresh();
      return;
    }
    if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
    setError(result.error.message);
  }

  const shifts: Shift[] = ["MATUTINO", "VESPERTINO", "INTEGRAL"];

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Data de retirada"
          name="withdrawalDate"
          type="date"
          errors={fieldErrors.withdrawalDate}
          required
        />
        <Field
          label="Data de devolução"
          name="returnDate"
          type="date"
          errors={fieldErrors.returnDate}
          required
        />
      </div>

      <Select label="Turno" name="shift" defaultValue="" errors={fieldErrors.shift} required>
        <option value="" disabled>
          Selecione…
        </option>
        {shifts.map((s) => (
          <option key={s} value={s}>
            {SHIFT_LABEL[s]}
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Horário de retirada"
          name="withdrawalTime"
          type="time"
          errors={fieldErrors.withdrawalTime}
          required
        />
        <Field
          label="Horário de devolução"
          name="returnTime"
          type="time"
          errors={fieldErrors.returnTime}
          required
        />
      </div>

      <Field
        label="Destino"
        name="destination"
        placeholder="Ex.: Rondonópolis - MT"
        errors={fieldErrors.destination}
        required
      />

      <Select
        label="Motivo da cautela"
        name="reasonSelect"
        value={selectedReason}
        onChange={(e) => setSelectedReason(e.target.value)}
        errors={fieldErrors.reason}
        required
      >
        <option value="" disabled>
          Selecione…
        </option>
        {reasons.map((r) => (
          <option key={r.id} value={r.name}>
            {r.name}
          </option>
        ))}
      </Select>

      {reasonNeedsCustom && (
        <Textarea
          label="Especificar motivo"
          name="otherReason"
          value={otherReason}
          onChange={(e) => setOtherReason(e.target.value)}
          rows={2}
          required
          hint="Descreva o motivo quando 'Outro' for selecionado."
        />
      )}

      <Field
        label="Número do termo (opcional)"
        name="termNumber"
        errors={fieldErrors.termNumber}
        hint="Caso já tenha sido emitido."
      />

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Enviar solicitação
        </Button>
      </div>
    </form>
  );
}
