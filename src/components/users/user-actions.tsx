"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserRole, type UserStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "@/lib/api-client";
import { EMAIL_DELIVERY_ENABLED } from "@/shared/features";
import { USER_ROLE_LABEL } from "./labels";
import { TemporaryPasswordSection } from "./temporary-password-section";

interface Props {
  userId: string;
  fullName: string;
  passwordResetRequestedAt: string | null;
  mustChangePassword: boolean;
  currentStatus: UserStatus;
  currentRole: UserRole;
  canChangeRole: boolean;
  isSelf: boolean;
}

export function UserActions({
  userId,
  fullName,
  passwordResetRequestedAt,
  mustChangePassword,
  currentStatus,
  currentRole,
  canChangeRole,
  isSelf,
}: Props) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [role, setRole] = useState<UserRole>(currentRole);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isSelf) {
    return <Alert tone="warning">Você não pode gerenciar a própria conta.</Alert>;
  }

  async function setStatus(status: "ACTIVE" | "BLOCKED") {
    setLoading(status);
    setError(null);
    const result = await apiPost(`/api/admin/users/${userId}/status`, {
      status,
      reason,
    });
    setLoading(null);
    if (result.ok) {
      setReason("");
      router.refresh();
      return;
    }
    setError(result.error.message);
  }

  async function submitRole() {
    if (role === currentRole) return;
    setLoading("role");
    setError(null);
    const result = await apiPost(`/api/admin/users/${userId}/role`, { role });
    setLoading(null);
    if (result.ok) {
      router.refresh();
      return;
    }
    setError(result.error.message);
  }

  return (
    <div className="space-y-6">
      {error && <Alert tone="error">{error}</Alert>}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Acesso</h3>
        {currentStatus === "PENDING_EMAIL_VERIFICATION" ? (
          <div className="space-y-2">
            <Alert tone="info">
              {EMAIL_DELIVERY_ENABLED
                ? "Usuário aguardando confirmação de e-mail. Se a mensagem não chegou, você pode confirmar o cadastro manualmente (registrado em auditoria)."
                : "Cadastro aguardando liberação. Confira os dados ao lado e libere o acesso (registrado em auditoria)."}
            </Alert>
            <Button
              type="button"
              loading={loading === "ACTIVE"}
              onClick={() => setStatus("ACTIVE")}
            >
              Liberar acesso
            </Button>
          </div>
        ) : currentStatus === "ACTIVE" ? (
          <div className="space-y-2">
            <Textarea
              label="Motivo do bloqueio (registrado em auditoria)"
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
            <Button
              type="button"
              variant="danger"
              loading={loading === "BLOCKED"}
              onClick={() => setStatus("BLOCKED")}
            >
              Bloquear acesso
            </Button>
          </div>
        ) : (
          <Button type="button" loading={loading === "ACTIVE"} onClick={() => setStatus("ACTIVE")}>
            Reativar acesso
          </Button>
        )}
      </section>

      {currentStatus === "ACTIVE" && (
        <TemporaryPasswordSection
          userId={userId}
          fullName={fullName}
          passwordResetRequestedAt={passwordResetRequestedAt}
          mustChangePassword={mustChangePassword}
        />
      )}

      {canChangeRole && (
        <section className="space-y-3 border-t border-gray-100 pt-6">
          <h3 className="text-sm font-semibold text-gray-700">Papel</h3>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-gray-600">Papel do usuário</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="h-10 w-56 rounded-md border border-gray-300 px-3 text-sm"
              >
                {Object.values(UserRole).map((r) => (
                  <option key={r} value={r}>
                    {USER_ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              loading={loading === "role"}
              onClick={submitRole}
              disabled={role === currentRole}
            >
              Salvar papel
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
