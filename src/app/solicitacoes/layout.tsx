import { UserAreaShell } from "@/components/shell/user-area-shell";

export default function SolicitacoesLayout({ children }: { children: React.ReactNode }) {
  return <UserAreaShell loginNext="/solicitacoes">{children}</UserAreaShell>;
}
