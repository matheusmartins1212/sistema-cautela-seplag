import { UserAreaShell } from "@/components/shell/user-area-shell";

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return <UserAreaShell loginNext="/painel">{children}</UserAreaShell>;
}
