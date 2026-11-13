"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ChecklistAnswer,
  ChecklistType,
  CleanlinessLevel,
  FuelCardStatus,
  FuelLevel,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { apiPost } from "@/lib/api-client";
import { PhotoUploader } from "@/components/checklists/photo-uploader";
import type { PublicChecklist } from "@/server/modules/checklists/checklist.dto";
import {
  ANSWER_LABEL,
  CHECKLIST_TYPE_LABEL,
  CLEANLINESS_LABEL,
  FUEL_CARD_LABEL,
  FUEL_LEVEL_LABEL,
  ITEM_GROUP_LABEL,
} from "./labels";
import { toAppWallClock } from "@/shared/time";

interface Props {
  cautionId: string;
  type: ChecklistType;
  checklist: PublicChecklist;
}

type Step = 0 | 1 | 2 | 3;

interface ItemDraft {
  itemKey: string;
  itemLabel: string;
  category: string | null;
  answer: ChecklistAnswer | "";
  observation: string;
}

const FUEL_LEVELS: FuelLevel[] = ["CHEIO", "TRES_QUARTOS", "MEIO", "UM_QUARTO", "RESERVA", "VAZIO"];
const CLEAN_LEVELS: CleanlinessLevel[] = ["LIMPO", "REGULAR", "SUJO"];
const CARD_STATUSES: FuelCardStatus[] = ["PRESENTE", "AUSENTE", "NAO_SE_APLICA"];
const ANSWERS: ChecklistAnswer[] = ["BOM", "RUIM", "AUSENTE", "NAO_SE_APLICA"];

async function putDraft(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
  return (await res.json().catch(() => null)) as
    | { ok: true; data: unknown }
    | { ok: false; error: { code: string; message: string } }
    | null;
}

export function ChecklistWizard({ cautionId, type, checklist }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado do formulário
  const [realDate, setRealDate] = useState(
    checklist.realDate ?? toAppWallClock(new Date()).toISOString().slice(0, 10),
  );
  const [realTime, setRealTime] = useState(
    checklist.realTime ?? toAppWallClock(new Date()).toISOString().slice(11, 16),
  );
  const [mileage, setMileage] = useState<string>(
    checklist.mileage != null ? String(checklist.mileage) : "",
  );
  const [fuelLevel, setFuelLevel] = useState<FuelLevel | "">(checklist.fuelLevel ?? "");
  const [fuelCardStatus, setFuelCardStatus] = useState<FuelCardStatus | "">(
    checklist.fuelCardStatus ?? "",
  );
  const [internalCleanliness, setInternalCleanliness] = useState<CleanlinessLevel | "">(
    checklist.internalCleanliness ?? "",
  );
  const [externalCleanliness, setExternalCleanliness] = useState<CleanlinessLevel | "">(
    checklist.externalCleanliness ?? "",
  );
  const [parkingLocation, setParkingLocation] = useState(checklist.parkingLocation ?? "");
  const [hasChangesFromInitial, setHasChangesFromInitial] = useState<boolean>(
    checklist.hasChangesFromInitial ?? false,
  );
  const [changesDescription, setChangesDescription] = useState(checklist.changesDescription ?? "");
  const [hasDamage, setHasDamage] = useState<boolean>(checklist.hasDamage ?? false);
  const [damageDescription, setDamageDescription] = useState(checklist.damageDescription ?? "");
  const [generalNotes, setGeneralNotes] = useState(checklist.generalNotes ?? "");

  const [items, setItems] = useState<ItemDraft[]>(
    checklist.items.map((i) => ({
      itemKey: i.itemKey,
      itemLabel: i.itemLabel,
      category: i.category,
      answer: i.answer ?? "",
      observation: i.observation ?? "",
    })),
  );

  // Agrupa itens — usamos uma heurística simples a partir do itemKey/label.
  // O agrupamento real visível usa o `category` (template). Como o backend
  // não retorna `group`, agrupamos por `category` (que pode ser null).
  const itemsByGroup = useMemo(() => {
    const groups = new Map<string, ItemDraft[]>();
    for (const it of items) {
      const key = it.category ?? "GERAIS";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(it);
    }
    return Array.from(groups.entries());
  }, [items]);

  function setItemAnswer(itemKey: string, answer: ChecklistAnswer | "") {
    setItems((prev) => prev.map((it) => (it.itemKey === itemKey ? { ...it, answer } : it)));
  }
  function setItemObs(itemKey: string, observation: string) {
    setItems((prev) => prev.map((it) => (it.itemKey === itemKey ? { ...it, observation } : it)));
  }

  function step0Valid() {
    return (
      realDate &&
      realTime &&
      mileage !== "" &&
      Number(mileage) >= 0 &&
      fuelLevel &&
      fuelCardStatus &&
      internalCleanliness &&
      externalCleanliness
    );
  }
  function step1Valid() {
    for (const it of items) {
      if (!it.answer) return false;
      if ((it.answer === "RUIM" || it.answer === "AUSENTE") && it.observation.trim().length === 0) {
        return false;
      }
    }
    return true;
  }

  function buildDraftPayload() {
    return {
      realDate: realDate || undefined,
      realTime: realTime || undefined,
      mileage: mileage === "" ? undefined : Number(mileage),
      fuelLevel: fuelLevel || undefined,
      fuelCardStatus: fuelCardStatus || undefined,
      internalCleanliness: internalCleanliness || undefined,
      externalCleanliness: externalCleanliness || undefined,
      parkingLocation: parkingLocation || undefined,
      hasChangesFromInitial,
      changesDescription: changesDescription || undefined,
      hasDamage,
      damageDescription: damageDescription || undefined,
      generalNotes: generalNotes || undefined,
      items: items
        .filter((it) => it.answer !== "")
        .map((it) => ({
          itemKey: it.itemKey,
          answer: it.answer,
          observation: it.observation || undefined,
        })),
    };
  }

  function buildSubmitPayload() {
    return {
      realDate,
      realTime,
      mileage: Number(mileage),
      fuelLevel,
      fuelCardStatus,
      internalCleanliness,
      externalCleanliness,
      parkingLocation: parkingLocation || null,
      hasChangesFromInitial,
      changesDescription: changesDescription || null,
      hasDamage,
      damageDescription: damageDescription || null,
      generalNotes: generalNotes || null,
      items: items.map((it) => ({
        itemKey: it.itemKey,
        answer: it.answer,
        observation: it.observation || null,
      })),
    };
  }

  async function persistDraftAndAdvance(next: Step) {
    setLoading(true);
    setError(null);
    const r = await putDraft(`/api/cautions/${cautionId}/checklists/${type}`, buildDraftPayload());
    setLoading(false);
    if (r && !r.ok) {
      setError(r.error.message);
      return;
    }
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    setLoading(true);
    setError(null);
    const r = await apiPost(
      `/api/cautions/${cautionId}/checklists/${type}/submit`,
      buildSubmitPayload(),
    );
    setLoading(false);
    if (!r.ok) {
      setError(r.error.message);
      return;
    }
    router.push(`/cautelas/${cautionId}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <StepIndicator step={step} />

      {error && <Alert tone="error">{error}</Alert>}

      {step === 0 && (
        <section className="space-y-4 rounded-card border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
            Dados gerais — {CHECKLIST_TYPE_LABEL[type]}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Data"
              type="date"
              value={realDate}
              onChange={(e) => setRealDate(e.target.value)}
              required
            />
            <Field
              label="Horário"
              type="time"
              value={realTime}
              onChange={(e) => setRealTime(e.target.value)}
              required
            />
          </div>
          <Field
            label="Quilometragem"
            type="number"
            min={0}
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Nível de combustível"
              value={fuelLevel}
              onChange={(e) => setFuelLevel(e.target.value as FuelLevel)}
              required
            >
              <option value="" disabled>
                Selecione…
              </option>
              {FUEL_LEVELS.map((f) => (
                <option key={f} value={f}>
                  {FUEL_LEVEL_LABEL[f]}
                </option>
              ))}
            </Select>
            <Select
              label="Cartão de abastecimento"
              value={fuelCardStatus}
              onChange={(e) => setFuelCardStatus(e.target.value as FuelCardStatus)}
              required
            >
              <option value="" disabled>
                Selecione…
              </option>
              {CARD_STATUSES.map((c) => (
                <option key={c} value={c}>
                  {FUEL_CARD_LABEL[c]}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Limpeza interna"
              value={internalCleanliness}
              onChange={(e) => setInternalCleanliness(e.target.value as CleanlinessLevel)}
              required
            >
              <option value="" disabled>
                Selecione…
              </option>
              {CLEAN_LEVELS.map((c) => (
                <option key={c} value={c}>
                  {CLEANLINESS_LABEL[c]}
                </option>
              ))}
            </Select>
            <Select
              label="Limpeza externa"
              value={externalCleanliness}
              onChange={(e) => setExternalCleanliness(e.target.value as CleanlinessLevel)}
              required
            >
              <option value="" disabled>
                Selecione…
              </option>
              {CLEAN_LEVELS.map((c) => (
                <option key={c} value={c}>
                  {CLEANLINESS_LABEL[c]}
                </option>
              ))}
            </Select>
          </div>

          <NavButtons
            onNext={() => persistDraftAndAdvance(1)}
            disabled={!step0Valid() || loading}
            loading={loading}
            nextLabel="Próximo: itens"
          />
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4 rounded-card border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
            Itens do checklist
          </h2>
          <p className="text-sm text-gray-600">
            Avalie cada item. Itens marcados como <strong>Ruim</strong> ou <strong>Ausente</strong>{" "}
            exigem uma observação descritiva.
          </p>

          <div className="space-y-6">
            {itemsByGroup.map(([groupKey, groupItems]) => (
              <div key={groupKey}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-institutional-700">
                  {ITEM_GROUP_LABEL[groupKey] ?? groupKey}
                </h3>
                <ul className="space-y-3">
                  {groupItems.map((it) => {
                    const needsObs = it.answer === "RUIM" || it.answer === "AUSENTE";
                    return (
                      <li
                        key={it.itemKey}
                        className="rounded-md border border-gray-200 bg-gray-50 p-3"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-sm font-medium text-gray-900">{it.itemLabel}</span>
                          <div className="flex flex-wrap gap-1">
                            {ANSWERS.map((a) => (
                              <button
                                key={a}
                                type="button"
                                onClick={() => setItemAnswer(it.itemKey, a)}
                                className={
                                  it.answer === a
                                    ? "rounded-md bg-institutional-800 px-3 py-1 text-xs font-semibold text-white"
                                    : "rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                                }
                              >
                                {ANSWER_LABEL[a]}
                              </button>
                            ))}
                          </div>
                        </div>
                        {needsObs && (
                          <div className="mt-2 space-y-3">
                            <Textarea
                              label="Observação obrigatória"
                              value={it.observation}
                              onChange={(e) => setItemObs(it.itemKey, e.target.value)}
                              rows={2}
                              required
                            />
                            <PhotoUploader
                              checklistId={checklist.id}
                              defaultType="ITEM"
                              itemKey={it.itemKey}
                              itemScope
                              label="Fotos do item"
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <NavButtons
            onPrev={() => setStep(0)}
            onNext={() => persistDraftAndAdvance(2)}
            disabled={!step1Valid() || loading}
            loading={loading}
            nextLabel="Próximo: observações"
          />
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4 rounded-card border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
            Fotos do veículo
          </h2>
          <p className="text-sm text-gray-600">
            Anexe fotos do estado atual do veículo. Pelo menos uma foto da dianteira e do painel é
            recomendado.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PhotoUploader checklistId={checklist.id} defaultType="DIANTEIRA" label="Dianteira" />
            <PhotoUploader checklistId={checklist.id} defaultType="TRASEIRA" label="Traseira" />
            <PhotoUploader
              checklistId={checklist.id}
              defaultType="LATERAL_ESQUERDA"
              label="Lateral esquerda"
            />
            <PhotoUploader
              checklistId={checklist.id}
              defaultType="LATERAL_DIREITA"
              label="Lateral direita"
            />
            <PhotoUploader
              checklistId={checklist.id}
              defaultType="PAINEL"
              label="Painel (KM e combustível)"
            />
            <PhotoUploader checklistId={checklist.id} defaultType="INTERIOR" label="Interior" />
            {type === "DEVOLUCAO" && (
              <PhotoUploader
                checklistId={checklist.id}
                defaultType="LOCAL_ESTACIONADO"
                label="Local em que estacionou"
              />
            )}
          </div>

          <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-600">
            Observações finais
          </h2>

          {type === "DEVOLUCAO" && (
            <Field
              label="Local em que o veículo foi estacionado"
              value={parkingLocation}
              onChange={(e) => setParkingLocation(e.target.value)}
              hint="Ex.: Pátio Central"
            />
          )}

          <CheckboxRow
            label="Há alterações em relação à condição inicial?"
            checked={hasChangesFromInitial}
            onChange={setHasChangesFromInitial}
          />
          {hasChangesFromInitial && (
            <Textarea
              label="Descreva as alterações"
              value={changesDescription}
              onChange={(e) => setChangesDescription(e.target.value)}
              rows={3}
            />
          )}

          <CheckboxRow label="Há avaria a registrar?" checked={hasDamage} onChange={setHasDamage} />
          {hasDamage && (
            <Textarea
              label="Descreva a avaria"
              value={damageDescription}
              onChange={(e) => setDamageDescription(e.target.value)}
              rows={3}
            />
          )}

          <Textarea
            label="Observações gerais (opcional)"
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            rows={3}
          />

          <NavButtons
            onPrev={() => setStep(1)}
            onNext={() => persistDraftAndAdvance(3)}
            disabled={loading}
            loading={loading}
            nextLabel="Revisar e enviar"
          />
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4 rounded-card border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
            Confirmar envio
          </h2>
          <p className="text-sm text-gray-700">
            Você está prestes a enviar o checklist de <strong>{CHECKLIST_TYPE_LABEL[type]}</strong>.
            Após o envio, o checklist <strong>não poderá mais ser editado</strong> por você.
          </p>
          <ul className="space-y-1 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
            <li>
              Data/hora:{" "}
              <strong>
                {realDate} {realTime}
              </strong>
            </li>
            <li>
              Quilometragem: <strong>{mileage}</strong>
            </li>
            <li>
              Combustível: <strong>{fuelLevel && FUEL_LEVEL_LABEL[fuelLevel as FuelLevel]}</strong>
            </li>
            <li>
              Itens respondidos:{" "}
              <strong>
                {items.filter((i) => i.answer !== "").length} / {items.length}
              </strong>
            </li>
            {hasDamage && <li className="text-danger">⚠️ Avaria registrada</li>}
          </ul>
          <NavButtons
            onPrev={() => setStep(2)}
            onNext={submit}
            loading={loading}
            disabled={loading}
            nextLabel="Enviar checklist"
          />
        </section>
      )}
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const labels = ["Dados", "Itens", "Observações", "Confirmar"];
  return (
    <ol className="flex items-center gap-2 text-xs">
      {labels.map((label, idx) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={
              idx === step
                ? "inline-flex h-7 w-7 items-center justify-center rounded-full bg-institutional-800 font-semibold text-white"
                : idx < step
                  ? "inline-flex h-7 w-7 items-center justify-center rounded-full bg-success/20 text-success"
                  : "inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500"
            }
          >
            {idx + 1}
          </span>
          <span className={idx === step ? "font-semibold text-institutional-900" : "text-gray-500"}>
            {label}
          </span>
          {idx < labels.length - 1 && (
            <span aria-hidden className="text-gray-300">
              ›
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-gray-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300"
      />
      {label}
    </label>
  );
}

function NavButtons({
  onPrev,
  onNext,
  disabled,
  loading,
  nextLabel,
}: {
  onPrev?: () => void;
  onNext: () => void;
  disabled?: boolean;
  loading?: boolean;
  nextLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      {onPrev ? (
        <Button variant="secondary" onClick={onPrev} disabled={loading}>
          Voltar
        </Button>
      ) : (
        <span />
      )}
      <Button onClick={onNext} disabled={disabled} loading={loading}>
        {nextLabel}
      </Button>
    </div>
  );
}
