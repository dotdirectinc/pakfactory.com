"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@pakfactory/ui/components/button";
import { Input } from "@pakfactory/ui/components/input";
import { Label } from "@pakfactory/ui/components/label";
import { Separator } from "@pakfactory/ui/components/separator";
import { cn } from "@pakfactory/ui/lib/utils";
import {
  authCredentialsSchema,
  type AuthCredentials,
} from "./auth-credentials-schema";
import type { LoginCopy, LoginHrefs } from "./login-copy";

const FIELD_CLASS = "h-11 rounded-sm border border-input bg-background text-sm";

export type LoginFormProps = {
  copy: LoginCopy;
  onSubmit: (form: FormData) => Promise<{ error?: string } | void>;
  next?: string;
  hrefs?: LoginHrefs;
  googleSlot?: ReactNode;
  embedded?: boolean;
};

export function LoginForm({
  copy,
  onSubmit,
  next,
  hrefs,
  googleSlot,
  embedded = false,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AuthCredentials>({
    resolver: zodResolver(authCredentialsSchema),
    defaultValues: { email: "", password: "" },
  });

  function submit(data: AuthCredentials) {
    setServerError(undefined);
    const form = new FormData();
    form.set("email", data.email);
    form.set("password", data.password);
    if (next) form.set("next", next);

    startTransition(async () => {
      const result = await onSubmit(form);
      if (result?.error) setServerError(result.error);
    });
  }

  const email = watch("email");
  const password = watch("password");
  const canSubmit = email.trim().length > 0 && password.trim().length > 0;

  const emailField = register("email");
  const passwordField = register("password");

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      {embedded ? null : (
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {copy.title}
          </h1>
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
      )}

      {googleSlot}

      {googleSlot ? (
        <div className="relative flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="shrink-0 text-xs text-muted-foreground">
            {copy.or}
          </span>
          <Separator className="flex-1" />
        </div>
      ) : null}

      <form
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(submit)}
        noValidate
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="login-email" className="text-xs font-medium">
            {copy.emailLabel}
          </Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder={copy.emailPlaceholder}
            aria-invalid={!!errors.email}
            className={FIELD_CLASS}
            {...emailField}
          />
          {errors.email ? (
            <p className="text-xs text-destructive" role="alert">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="login-password" className="text-xs font-medium">
              {copy.passwordLabel}
            </Label>
            {hrefs?.forgotPassword ? (
              <Link
                href={hrefs.forgotPassword}
                className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
              >
                {copy.forgotPassword}
              </Link>
            ) : null}
          </div>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              className={cn(FIELD_CLASS, "pr-10")}
              {...passwordField}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={
                showPassword ? copy.hidePassword : copy.showPassword
              }
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </Button>
          </div>
          {errors.password ? (
            <p className="text-xs text-destructive" role="alert">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        {serverError ? (
          <p className="text-sm text-destructive" role="alert">
            {serverError}
          </p>
        ) : null}

        <Button
          type="submit"
          className="h-11 w-full rounded-sm"
          disabled={!canSubmit || pending}
        >
          {pending ? copy.signingIn : copy.signIn}
        </Button>
      </form>

      {hrefs?.signUp && copy.noAccount && copy.signUp ? (
        <p className="text-center text-sm text-foreground">
          {copy.noAccount}{" "}
          <Link
            href={hrefs.signUp}
            className="font-medium underline underline-offset-4"
          >
            {copy.signUp}
          </Link>
        </p>
      ) : null}

      {hrefs?.terms && hrefs?.privacy && copy.legalPrefix ? (
        <p className="text-center text-xs text-muted-foreground">
          {copy.legalPrefix}{" "}
          <Link
            href={hrefs.terms}
            className="underline underline-offset-4"
          >
            {copy.termsOfService}
          </Link>{" "}
          and{" "}
          <Link
            href={hrefs.privacy}
            className="underline underline-offset-4"
          >
            {copy.privacyPolicy}
          </Link>
          {copy.legalSuffix}
        </p>
      ) : null}
    </div>
  );
}
