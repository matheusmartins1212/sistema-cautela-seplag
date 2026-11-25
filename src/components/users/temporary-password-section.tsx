"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiPost } from "@/lib/api-client";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Cuiaba",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Senha da conta: a central gera uma senha provisória (a pedido da pessoa ou
 * por iniciativa própria), mostrada uma única vez para ser repassada. No
 * próximo acesso, a troca é obrigatória.
 */
export function TemporaryPasswordSection({
  userId,
  fullName,
  passwordResetRequestedAt,
  mustChangePassword,
}: {
  userId: string;
  fullName: string;
  passwordResetRequestedAt: string | null;
  mustChangePassword: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    const result = await apiPost<{ temporaryPassword: string }>(
      `/api/admin/users/${userId}/temporary-password`,
      {},
    );
    setLoading(false);
    setConfirming(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setCopied(false);
    setGenerated(result.data.temporaryPassword);
  }

  async function copy() {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function close() {
    setGenerated(null);
    router.refresh();
  }

  return (
    <section className="space-y-3 border-t border-gray-100 pt-6">
      <h3 className="text-sm font-semibold text-gray-700">Senha</h3>
      {passwordResetRequestedAt ? (
        <Alert tone="warning">
          Pediu uma nova senha em{" "}
          {dateTime.format(new Date(passwordResetRequestedAt)).replace(",", " às")}. Gere uma senha
          provisória e repasse à pessoa.
        </Alert>
      ) : mustChangePassword ? (
        <p className="text-sm text-gray-600">
          Senha provisória gerada. A pessoa ainda não fez o primeiro acesso para trocá-la.
        </p>
      ) : (
        <p className="text-sm text-gray-600">
          Se a pessoa esqueceu a senha, gere uma provisória. No próximo acesso ela define uma nova.
        </p>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      <Button
        type="button"
        variant={passwordResetRequestedAt ? "primary" : "secondary"}
        onClick={() => setConfirming(true)}
      >
        Gerar senha provisória
      </Button>

      <ConfirmDialog
        open={confirming}
        title="Gerar senha provisória?"
        confirmLabel="Gerar"
        loading={loading}
        onCancel={() => setConfirming(false)}
        onConfirm={generate}
        description={
          <>
            A senha atual de <strong>{fullName}</strong> deixa de funcionar e as sessões abertas são
            encerradas. No próximo acesso com a senha provisória, a troca é obrigatória.
          </>
        }
      />

      <ConfirmDialog
        open={generated !== null}
        title="Senha provisória"
        confirmLabel="Concluir"
        hideCancel
        onCancel={close}
        onConfirm={close}
        description={
          <div className="space-y-3">
            <p>
              Repasse esta senha a <strong>{fullName}</strong>. Ela não será mostrada de novo.
            </p>
            <div className="flex items-center gap-2">
              <p
                data-temporary-password
                className="flex-1 select-all rounded-md bg-gray-50 px-4 py-3 text-center font-mono text-xl font-semibold tracking-wider text-institutional-900 ring-1 ring-gray-200"
              >
                {generated}
              </p>
              <Button type="button" variant="secondary" onClick={copy}>
                {copied ? "Copiada" : "Copiar"}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              No primeiro acesso com ela, o sistema pede para criar uma senha nova.
            </p>
          </div>
        }
      />
    </section>
  );
}
