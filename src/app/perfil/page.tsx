import { redirect } from "next/navigation";
import { getCurrentSession } from "@/server/modules/auth/session";
import { ProfilePage } from "@/components/profile/profile-page";
import { toProfileView } from "@/components/profile/profile-view";

export default async function Page() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?next=/perfil");
  return <ProfilePage profile={toProfileView(session.user)} />;
}
