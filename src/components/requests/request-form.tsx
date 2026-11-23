"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { apiPost } from "@/lib/api-client";

type FieldErrors = Record<string, string[]>;

interface Props {
  reasons: { id: string; name: string }[];
  /** Órgão do cadastro do solicitante; nulo em contas antigas. */
  userAgency: string | null;
  /** Órgãos ativos, para contas antigas escolherem o seu. */
  agencies: { id: string; name: string }[];
  /** Telefone do cadastro, sugerido como contato no dia da viagem. */
  defaultPhone: string;
}

interface ApiResponse {
  request: { id: string; publicCode: string };
}

const OUTRO = "Outro";

/**
 * Pedido à central, em duas modalidades:
 * - com condutor: a central envia veículo e motorista; o pedido informa de
 *   onde sai e quantas pessoas vão;
 * - sem condutor: cautela tradicional, o próprio servidor retira e dirige.
 */
export function RequestForm({ reasons, userAgency, agencies, defaultPhone }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState<string>("");
  const [withDriver, setWithDriver] = useState<boolean | null>(null);

  const reasonNeedsCustom = selectedReason === OUTRO;
  const finalReason = reasonNeedsCustom ? otherReason : selectedReason;
  const mustPickAgency = userAgency === null && agencies.length > 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (withDriver === null) {
      setFieldErrors({ withDriver: ["Escolha como será a viagem."] });
      setError("Escolha como será a viagem: com condutor da central ou você mesmo dirigindo.");
      return;
    }
    setLoading(true);

    const f = new FormData(e.currentTarget);
    const payload = {
      withdrawalDate: f.get("withdrawalDate"),
      withdrawalTime: f.get("withdrawalTime"),
      returnDate: f.get("returnDate"),
      returnTime: f.get("returnTime"),
      withDriver,
      origin: withDriver ? f.get("origin") : null,
      destination: f.get("destination"),
      passengerCount: withDriver ? f.get("passengerCount") : null,
      passengerNames: withDriver ? f.get("passengerNames") || null : null,
      reason: finalReason,
      contactPhone: f.get("contactPhone") || null,
      agency: mustPickAgency ? f.get("agency") : null,
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

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && <Alert tone="error">{error}</Alert>}

      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
          Órgão solicitante
        </legend>
        {userAgency && (
          <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800">
            {userAgency}
          </p>
        )}
        {mustPickAgency && (
          <Select
            label="Órgão"
            name="agency"
            defaultValue=""
            errors={fieldErrors.agency}
            hint="Fica salvo na sua conta para os próximos pedidos."
            required
          >
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
        {userAgency === null && agencies.length === 0 && (
          <p className="text-sm text-gray-500">
            A central ainda não cadastrou os órgãos atendidos. O pedido segue sem órgão.
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
          Como será a viagem?
        </legend>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
          <ModeOption
            checked={withDriver === true}
            onSelect={() => setWithDriver(true)}
            title="Com condutor da central"
            description="A central envia o veículo com motorista para buscar você e os passageiros."
          />
          <ModeOption
            checked={withDriver === false}
            onSelect={() => setWithDriver(false)}
            title="Eu mesmo dirijo"
            description="Você retira o veículo, dirige e devolve, preenchendo os checklists (cautela)."
          />
        </div>
        {fieldErrors.withDriver && (
          <p className="mt-2 text-xs text-danger">{fieldErrors.withDriver[0]}</p>
        )}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
          Quando
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Data de saída"
            name="withdrawalDate"
            type="date"
            errors={fieldErrors.withdrawalDate}
            required
          />
          <Field
            label="Horário de saída"
            name="withdrawalTime"
            type="time"
            errors={fieldErrors.withdrawalTime}
            required
          />
          <Field
            label="Data de retorno"
            name="returnDate"
            type="date"
            errors={fieldErrors.returnDate}
            required
          />
          <Field
            label="Horário previsto de retorno"
            name="returnTime"
            type="time"
            errors={fieldErrors.returnTime}
            required
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
          Trajeto
        </legend>
        {withDriver && (
          <Field
            label="Local de saída"
            name="origin"
            placeholder="Ex.: Centro Político Administrativo, Cuiabá"
            hint="Onde o condutor deve buscar os passageiros."
            errors={fieldErrors.origin}
            required
          />
        )}
        <Field
          label="Destino"
          name="destination"
          placeholder="Ex.: Rondonópolis - MT"
          errors={fieldErrors.destination}
          required
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
          {withDriver ? "Passageiros e finalidade" : "Contato e finalidade"}
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {withDriver && (
            <Field
              label="Número de passageiros"
              name="passengerCount"
              type="number"
              min={1}
              max={60}
              defaultValue={1}
              errors={fieldErrors.passengerCount}
              required
            />
          )}
          <Field
            label="Telefone de contato no dia"
            name="contactPhone"
            type="tel"
            defaultValue={defaultPhone}
            hint={
              withDriver
                ? "O condutor usa este número para combinar o embarque."
                : "A central usa este número se precisar falar com você."
            }
            errors={fieldErrors.contactPhone}
          />
        </div>
        {withDriver && (
          <Textarea
            label="Nomes dos passageiros (opcional)"
            name="passengerNames"
            rows={3}
            hint="Um por linha, se já souber quem vai."
            errors={fieldErrors.passengerNames}
          />
        )}
        <Select
          label="Finalidade da viagem"
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
            label="Especificar finalidade"
            name="otherReason"
            value={otherReason}
            onChange={(e) => setOtherReason(e.target.value)}
            rows={2}
            required
            hint="Descreva a finalidade quando 'Outro' for selecionado."
          />
        )}
      </fieldset>

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

function ModeOption({
  checked,
  onSelect,
  title,
  description,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={
        checked
          ? "flex items-start gap-3 rounded-card border-2 border-institutional-700 bg-institutional-50 p-4 text-left"
          : "flex items-start gap-3 rounded-card border-2 border-gray-200 bg-white p-4 text-left hover:border-institutional-300"
      }
    >
      <span
        aria-hidden="true"
        className={
          checked
            ? "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-institutional-700"
            : "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-gray-300"
        }
      >
        {checked && <span className="h-2 w-2 rounded-full bg-institutional-700" />}
      </span>
      <span>
        <span className="block text-sm font-semibold text-gray-900">{title}</span>
        <span className="mt-0.5 block text-sm text-gray-600">{description}</span>
      </span>
    </button>
  );
}
