import { accountDisplayName } from "@pakfactory/supabase/session";
import { HomeView } from "@/components/home/home-view";
import { requireInternalUser } from "@/lib/auth/require-internal-user";
import { ADMIN_HOME_COPY } from "@/lib/copy/home";

export const metadata = {
  title: ADMIN_HOME_COPY.pageTitle,
};

export default async function AdminHomePage() {
  const { user } = await requireInternalUser("/");

  return <HomeView displayName={accountDisplayName(user)} />;
}
