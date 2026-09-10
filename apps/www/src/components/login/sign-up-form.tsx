'use client';

import {useState, useTransition} from 'react';
import Link from 'next/link';
import {Eye, EyeOff} from 'lucide-react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {Button} from '@pakfactory/ui/components/button';
import {Input} from '@pakfactory/ui/components/input';
import {Label} from '@pakfactory/ui/components/label';
import {Separator} from '@pakfactory/ui/components/separator';
import {cn} from '@pakfactory/ui/lib/utils';
import {LoginGoogleButton} from '@/components/login/login-google-button';
import {
    authCredentialsSchema,
    type AuthCredentials,
} from '@/lib/auth/auth-form-schema';
import {LOGIN_COPY} from '@/lib/copy/login';
import {signUp} from '@/lib/auth/actions';
import {SIGN_UP_COPY} from '@/lib/copy/sign-up';
import {WWW_ROUTES} from '@/lib/www-routes';

const FIELD_CLASS = 'h-11 rounded-sm border border-input bg-background text-sm';

export function SignUpForm({prefillEmail}: {prefillEmail?: string}) {
    const [serverError, setServerError] = useState<string>();
    const [pending, startTransition] = useTransition();
    const [showPassword, setShowPassword] = useState(false);
    // Locked by default when the buyer arrived from a receipt, and only ever
    // unlocked by an explicit click — see `unlockEmail`.
    const [emailUnlocked, setEmailUnlocked] = useState(false);
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: {errors},
    } = useForm<AuthCredentials>({
        resolver: zodResolver(authCredentialsSchema),
        defaultValues: {email: prefillEmail ?? '', password: ''},
    });

    function onSubmit(data: AuthCredentials) {
        setServerError(undefined);
        const form = new FormData();
        form.set('email', data.email);
        form.set('password', data.password);

        // On success the action redirects to /verify — including when the address
        // is ALREADY registered, so this form cannot be used to discover who has
        // an account. The email is the username here, so that reply would be a
        // customer list.
        startTransition(async () => {
            const result = await signUp({}, form);
            if (result?.error) setServerError(result.error);
        });
    }

    const email = watch('email');
    const password = watch('password');

    // The buyer arrived from a receipt and has edited the address it was filed
    // under. Compared case-insensitively because the server lowercases before
    // it ever reaches Supabase (`emailOf` in lib/auth/actions.ts), so a stray
    // capital is not a different address and must not raise this.
    /**
     * Locked, because this link only exists inside a receipt DELIVERED to that
     * address — so it is provably the buyer's, and a typo cannot have brought
     * them here. Changing it forfeits the claim, which
     * `claim_rfqs_for_current_user` makes on the verified session email.
     *
     * `readOnly`, NOT `disabled`: a disabled input is skipped by keyboard
     * navigation and is not submitted with the form. readOnly keeps it
     * focusable and copyable.
     *
     * Only ever locked when a prefill actually arrived; a plain visit to
     * /sign-up is a normal, fully editable form.
     */
    const emailLocked = Boolean(prefillEmail) && !emailUnlocked;

    // Clears the field rather than handing over a populated one, so a buyer who
    // asked for a different address has to type it deliberately.
    const unlockEmail = () => {
        setEmailUnlocked(true);
        setValue('email', '', {shouldValidate: false});
    };
    const canSubmit =
        email.trim().length > 0 && password.trim().length > 0;

    const emailField = register('email');
    const passwordField = register('password');

    return (
        <div className="flex w-full max-w-sm flex-col gap-6">
            <div className="flex flex-col gap-2 text-center">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {SIGN_UP_COPY.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {SIGN_UP_COPY.subtitle}
                </p>
            </div>

            <LoginGoogleButton label={LOGIN_COPY.continueWithGoogle} />

            <div className="relative flex items-center gap-4">
                <Separator className="flex-1" />
                <span className="shrink-0 text-xs text-muted-foreground">
                    {LOGIN_COPY.or}
                </span>
                <Separator className="flex-1" />
            </div>

            <form
                className="flex flex-col gap-4"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
            >
                <div className="flex flex-col gap-2">
                    <Label
                        htmlFor="sign-up-email"
                        className="text-xs font-medium"
                    >
                        {LOGIN_COPY.emailLabel}
                    </Label>
                    <Input
                        id="sign-up-email"
                        type="email"
                        autoComplete="email"
                        placeholder={LOGIN_COPY.emailPlaceholder}
                        aria-invalid={!!errors.email}
                        readOnly={emailLocked}
                        aria-readonly={emailLocked || undefined}
                        className={cn(
                            FIELD_CLASS,
                            emailLocked && 'bg-muted text-muted-foreground',
                        )}
                        {...emailField}
                    />
                    {errors.email ? (
                        <p className="text-xs text-destructive" role="alert">
                            {errors.email.message}
                        </p>
                    ) : null}
                    {emailLocked ? (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground">
                                {SIGN_UP_COPY.emailLockedHint}
                            </p>
                            <button
                                type="button"
                                onClick={unlockEmail}
                                className="text-xs font-medium underline underline-offset-4"
                            >
                                {SIGN_UP_COPY.useDifferentEmail}
                            </button>
                        </div>
                    ) : null}
                    {prefillEmail && emailUnlocked ? (
                        <p
                            className="rounded-sm border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200"
                            role="status"
                        >
                            {SIGN_UP_COPY.emailUnlockedWarning(prefillEmail)}
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-col gap-2">
                    <Label
                        htmlFor="sign-up-password"
                        className="text-xs font-medium"
                    >
                        {LOGIN_COPY.passwordLabel}
                    </Label>
                    <div className="relative">
                        <Input
                            id="sign-up-password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            aria-invalid={!!errors.password}
                            className={cn(FIELD_CLASS, 'pr-10')}
                            {...passwordField}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={
                                showPassword
                                    ? LOGIN_COPY.hidePassword
                                    : LOGIN_COPY.showPassword
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
                    {SIGN_UP_COPY.signUp}
                </Button>
            </form>

            <p className="text-center text-sm text-foreground">
                {SIGN_UP_COPY.haveAccount}{' '}
                <Link
                    href={WWW_ROUTES.login}
                    className="font-medium underline underline-offset-4"
                >
                    {SIGN_UP_COPY.signIn}
                </Link>
            </p>

            <p className="text-center text-xs text-muted-foreground">
                {LOGIN_COPY.legalPrefix}{' '}
                <Link
                    href={LOGIN_COPY.termsHref}
                    className="underline underline-offset-4"
                >
                    {LOGIN_COPY.termsOfService}
                </Link>{' '}
                and{' '}
                <Link
                    href={LOGIN_COPY.privacyHref}
                    className="underline underline-offset-4"
                >
                    {LOGIN_COPY.privacyPolicy}
                </Link>
                {LOGIN_COPY.legalSuffix}
            </p>
        </div>
    );
}
