import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser, safeNext } from "@pakfactory/supabase/session";
import { AdminLoginPageView } from "@/components/login/admin-login-page-view";
import { isAdminDevBypassEnabled } from "@/lib/auth/dev-bypass";
import { isSupabaseConfigured } from "@/lib/auth/supabase-configured";
import { getInternalAccountAdapter } from "@/lib/adapters";
import { ADMIN_LOGIN_ERRORS } from "@/lib/copy/login";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const destination = safeNext(next, "/");

  if (isAdminDevBypassEnabled()) {
    redirect(destination);
  }

  let notice = error ? ADMIN_LOGIN_ERRORS[error] : undefined;

  if (isSupabaseConfigured()) {
    const user = await getUser();

    if (user?.email) {
      const account = await getInternalAccountAdapter().getByEmail(user.email);
      if (account) {
        redirect(destination);
      }
      redirect("/auth/sign-out?error=not_internal");
    }
  } else if (!notice) {
    notice = ADMIN_LOGIN_ERRORS.supabase_not_configured;
  }

  return <AdminLoginPageView next={destination} notice={notice} />;
}
