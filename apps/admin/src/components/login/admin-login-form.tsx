"use client";

import { LoginForm } from "@pakfactory/auth-ui/login-form";
import { AdminLoginGoogleButton } from "@/components/login/admin-login-google-button";
import { signInInternal } from "@/lib/auth/actions";
import { ADMIN_LOGIN_COPY } from "@/lib/copy/login";
import { adminWwwHrefs } from "@/lib/www-links";

export function AdminLoginForm({ next }: { next?: string }) {
  const wwwHrefs = adminWwwHrefs();

  return (
    <LoginForm
      copy={ADMIN_LOGIN_COPY}
      onSubmit={(form) => signInInternal({}, form)}
      next={next}
      hrefs={{
        forgotPassword: wwwHrefs.forgotPassword,
      }}
      googleSlot={
        <AdminLoginGoogleButton
          label={ADMIN_LOGIN_COPY.continueWithGoogle}
          next={next}
        />
      }
    />
  );
}
