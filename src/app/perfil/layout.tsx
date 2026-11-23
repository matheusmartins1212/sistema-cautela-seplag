import { UserAreaShell } from "@/components/shell/user-area-shell";

export default function PerfilLayout({ children }: { children: React.ReactNode }) {
  return <UserAreaShell loginNext="/perfil">{children}</UserAreaShell>;
}
