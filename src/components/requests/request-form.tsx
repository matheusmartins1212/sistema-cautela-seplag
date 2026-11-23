"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { apiPost } from "@/lib/api-client";

type FieldErrors = Record<string, string[]>;

interface Props {
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

const MAX_PASSENGERS = 60;

interface PassengerRow {
  key: number;
  name: string;
}

function normalizeName(v: string): string {
  return v.trim().replace(/\s+/g, " ");
}

/** Mesma regra do backend: cada passageiro com nome e sobrenome. */
function passengerErrors(rows: PassengerRow[]): FieldErrors {
  const errs: FieldErrors = {};
  rows.forEach((p, i) => {
    const n = normalizeName(p.name);
    if (!n) errs[`passengers.${i}`] = ["Informe o nome completo do passageiro."];
    else if (n.split(" ").length < 2)
      errs[`passengers.${i}`] = ["Informe o nome completo (nome e sobrenome)."];
  });
  return errs;
}

/**
 * Pedido à central, em duas modalidades:
 * - com condutor: a central envia veículo e motorista; o pedido informa de
 *   onde sai e o nome completo de cada passageiro (começa com 1);
 * - sem condutor: cautela tradicional, o próprio servidor retira e dirige.
 */
export function RequestForm({ userAgency, agencies, defaultPhone }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [withDriver, setWithDriver] = useState<boolean | null>(null);
  const [passengers, setPassengers] = useState<PassengerRow[]>([{ key: 0, name: "" }]);
  const [focusKey, setFocusKey] = useState<number | null>(null);
  const nextKey = useRef(1);

  function addPassenger() {
    if (passengers.length >= MAX_PASSENGERS) return;
    const key = nextKey.current++;
    setPassengers((rows) => [...rows, { key, name: "" }]);
    setFocusKey(key);
  }

  function removePassenger(key: number) {
    setPassengers((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== key) : rows));
    // Os erros são por posição; refeitos no próximo envio.
    setFieldErrors(({ passengers: _list, ...rest }) =>
      Object.fromEntries(Object.entries(rest).filter(([k]) => !k.startsWith("passengers."))),
    );
  }

  function renamePassenger(key: number, name: string) {
    setPassengers((rows) => rows.map((r) => (r.key === key ? { ...r, name } : r)));
  }

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
    if (withDriver) {
      const errs = passengerErrors(passengers);
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        setError("Informe o nome completo de cada passageiro.");
        return;
      }
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
      passengers: withDriver ? passengers.map((p) => normalizeName(p.name)) : null,
      reason: f.get("reason"),
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

      {withDriver && (
        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
            Passageiros
          </legend>
          <p className="text-xs text-gray-500">
            Informe o nome completo de cada pessoa que vai no veículo, inclusive você, se for
            viajar.
          </p>
          <ol className="space-y-3">
            {passengers.map((p, i) => (
              <li key={p.key} className="relative">
                <Field
                  label={`Passageiro ${i + 1}`}
                  name={`passenger-${p.key}`}
                  placeholder="Nome completo"
                  autoComplete="off"
                  value={p.name}
                  onChange={(e) => renamePassenger(p.key, e.target.value)}
                  autoFocus={p.key === focusKey}
                  maxLength={120}
                  errors={fieldErrors[`passengers.${i}`]}
                  required
                />
                {passengers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePassenger(p.key)}
                    className="absolute right-0 top-0 text-xs font-medium text-danger hover:underline"
                    aria-label={`Remover passageiro ${i + 1}`}
                  >
                    Remover
                  </button>
                )}
              </li>
            ))}
          </ol>
          {fieldErrors.passengers && (
            <p className="text-xs text-danger">{fieldErrors.passengers[0]}</p>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={addPassenger}
            disabled={passengers.length >= MAX_PASSENGERS}
          >
            + Adicionar passageiro
          </Button>
        </fieldset>
      )}

      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
          Contato e finalidade
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <Textarea
          label="Finalidade da viagem"
          name="reason"
          rows={3}
          maxLength={1000}
          placeholder="Ex.: Reunião com a equipe regional para acompanhamento do contrato de manutenção."
          hint="Descreva o motivo da viagem."
          errors={fieldErrors.reason}
          required
        />
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
