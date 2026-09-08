"use client";

import { LoginForm } from "@pakfactory/auth-ui/login-form";
import { AdminLoginGoogleButton } from "@/components/login/admin-login-google-button";
import { signInInternal } from "@/lib/auth/actions";
import { ADMIN_LOGIN_COPY } from "@/lib/copy/login";

/**
 * Google is the sign-in path. The email + password form renders only when
 * `passwordEnabled` — the server's read of `ADMIN_LOGIN=true`, passed down as a
 * prop rather than read here, since a client component cannot see a non-public
 * env var and a `NEXT_PUBLIC_` one would be baked into the bundle.
 *
 * 🔴 This prop hides the form; it does not close the path. `signInInternal`
 * checks the same flag on the server, which is what actually disables password
 * sign-in.
 *
 * No `hrefs` are passed in either branch, so `LoginForm` renders no
 * forgot-password or sign-up link. Those pointed at the CUSTOMER app and are how
 * staff ended up in the buyer flows; `lib/www-links.ts` was deleted with them
 * and `NEXT_PUBLIC_WWW_URL` is still not read by admin.
 */
export function AdminLoginForm({
  next,
  passwordEnabled = false,
}: {
  next?: string;
  passwordEnabled?: boolean;
}) {
  const googleButton = (
    <AdminLoginGoogleButton
      label={ADMIN_LOGIN_COPY.continueWithGoogle}
      next={next}
    />
  );

  if (passwordEnabled) {
    return (
      <LoginForm
        copy={ADMIN_LOGIN_COPY}
        onSubmit={(form) => signInInternal({}, form)}
        next={next}
        googleSlot={googleButton}
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {ADMIN_LOGIN_COPY.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {ADMIN_LOGIN_COPY.subtitle}
        </p>
      </div>

      {googleButton}

      <p className="text-xs leading-snug text-muted-foreground">
        {ADMIN_LOGIN_COPY.accessNote}
      </p>
    </div>
  );
}
