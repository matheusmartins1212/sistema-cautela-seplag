import { LogoutButton } from "@/components/logout-button";
import { ChangeOwnPasswordForm } from "./change-own-password-form";
import { USER_STATUS_LABEL } from "@/components/users/labels";
import type { ProfileView } from "./profile-view";

function initials(fullName: string): string {
  const parts = fullName
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-gray-100 px-6 py-4 first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd
        className={
          value
            ? "mt-0.5 text-sm font-medium text-gray-900 [overflow-wrap:anywhere]"
            : "mt-0.5 text-sm italic text-gray-400"
        }
      >
        {value || "Não informado"}
      </dd>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-card border border-gray-200 bg-white shadow-card">
      <div className="border-b border-gray-100 px-6 py-3.5">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
      </div>
      <dl className="grid sm:grid-cols-2">{children}</dl>
    </section>
  );
}

/** Página "Meu perfil": dados da conta de quem está logado e a saída do sistema. */
export function ProfilePage({ profile }: { profile: ProfileView }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-institutional-900">Meu perfil</h1>
        <p className="mt-1 text-sm text-gray-600">
          Seus dados no sistema. Eles vêm do cadastro; se algum estiver errado, peça a correção à
          SATGF.
        </p>
      </div>

      <section className="overflow-hidden rounded-card border border-gray-200 bg-white shadow-card">
        <div className="flex flex-col gap-4 bg-institutional-900 px-6 py-6 text-white sm:flex-row sm:items-center">
          <span
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-institutional-700 text-xl font-semibold"
          >
            {initials(profile.fullName)}
          </span>
          <div className="min-w-0">
            <p className="text-xl font-semibold leading-tight [overflow-wrap:anywhere]">
              {profile.fullName}
            </p>
            <p className="mt-1 text-sm text-institutional-200 [overflow-wrap:anywhere]">
              {profile.email}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">
                {profile.roleLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">
                <span
                  aria-hidden="true"
                  className={
                    profile.status === "ACTIVE"
                      ? "h-1.5 w-1.5 rounded-full bg-emerald-400"
                      : profile.status === "BLOCKED"
                        ? "h-1.5 w-1.5 rounded-full bg-red-400"
                        : "h-1.5 w-1.5 rounded-full bg-amber-300"
                  }
                />
                {USER_STATUS_LABEL[profile.status]}
              </span>
            </div>
          </div>
        </div>
      </section>

      <Section title="Dados pessoais">
        <Field label="Nome completo" value={profile.fullName} />
        <Field label="CPF" value={profile.cpfMasked} />
        <Field label="Matrícula" value={profile.registrationNumber} />
        <Field label="Telefone" value={profile.phone} />
      </Section>

      <Section title="Lotação">
        <Field label="Setor" value={profile.sector} />
        <Field label="Lotação" value={profile.department} />
      </Section>

      <Section title="Conta">
        <Field label="E-mail institucional" value={profile.email} />
        <Field label="Perfil de acesso" value={profile.roleLabel} />
        <Field label="Conta criada em" value={profile.memberSince} />
        <Field label="E-mail confirmado em" value={profile.emailVerifiedOn} />
      </Section>

      <ChangeOwnPasswordForm />

      <section className="flex flex-col gap-4 rounded-card border border-gray-200 bg-white px-6 py-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Sessão</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Encerre o acesso neste dispositivo. Para entrar de novo, use seu e-mail e senha.
          </p>
        </div>
        <LogoutButton appearance="danger" />
      </section>
    </div>
  );
}
