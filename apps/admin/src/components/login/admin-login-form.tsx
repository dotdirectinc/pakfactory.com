"use client";

import { AdminLoginGoogleButton } from "@/components/login/admin-login-google-button";
import { ADMIN_LOGIN_COPY } from "@/lib/copy/login";

/**
 * Google only. There is deliberately no email + password form here.
 *
 * Admin accounts are provisioned per person as `internal_user` rows, and a
 * password form adds a second credential to manage, reset and leak for accounts
 * that already have a company Google identity (decided 2026-09-04). It also gave
 * the admin app its own forgot-password link into the CUSTOMER app, which is how
 * staff ended up in the buyer flows.
 *
 * `signInInternal` and the shared `LoginForm` are gone from this path with it.
 */
export function AdminLoginForm({ next }: { next?: string }) {
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

      <AdminLoginGoogleButton
        label={ADMIN_LOGIN_COPY.continueWithGoogle}
        next={next}
      />

      <p className="text-xs leading-snug text-muted-foreground">
        {ADMIN_LOGIN_COPY.accessNote}
      </p>
    </div>
  );
}
