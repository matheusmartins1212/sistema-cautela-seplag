import { UserAreaShell } from "@/components/shell/user-area-shell";

export default function CautelasLayout({ children }: { children: React.ReactNode }) {
  return <UserAreaShell loginNext="/cautelas">{children}</UserAreaShell>;
}
