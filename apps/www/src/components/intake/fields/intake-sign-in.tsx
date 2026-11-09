'use client';

import {useState} from 'react';
import {LoginDialog} from '@/components/login/login-dialog';
import {REQUEST_COPY} from '@/lib/copy/request';
import {useRequest} from '@/lib/request/request-provider';
import {Avatar, AvatarFallback} from '@pakfactory/ui/components/avatar';
import {cn} from '@pakfactory/ui/lib/utils';

/**
 * "Sign in" on the step intake (owner Nov 2, WEB-J1 sign-in proposal): opens the login
 * dialog in place, so the request stays as it is.
 * Once signed in, the top bar shows the buyer's avatar and name instead. After signing in, Contact
 * drops out and the intake moves on by itself.
 */
export function IntakeSignIn({variant}: {variant: 'contact' | 'topbar'}) {
    const {viewer} = useRequest();
    const [open, setOpen] = useState(false);
    if (viewer) {
        // Signed in (owner Nov 2): the top bar shows who they are — avatar and name; Contact shows nothing.
        if (variant !== 'topbar') return null;
        const name = `${viewer.firstName} ${viewer.lastName}`.trim() || viewer.email;
        const initials = `${viewer.firstName.charAt(0)}${viewer.lastName.charAt(0)}`.toUpperCase() || viewer.email.charAt(0).toUpperCase();
        return (
            <span className="flex items-center gap-2 text-sm" title={viewer.email}>
                <Avatar className="size-7">
                    <AvatarFallback className="bg-muted text-[11px] font-medium text-foreground">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[12rem] truncate font-medium sm:inline">{name}</span>
            </span>
        );
    }

    function signIn() {
        setOpen(true);
    }

    const link = (
        <button
            type="button"
            onClick={signIn}
            className="cursor-pointer font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
        >
            {REQUEST_COPY.intakeSignIn}
        </button>
    );
    return (
        <>
            {variant === 'contact' ? (
                <p className={cn('text-sm text-muted-foreground sm:whitespace-nowrap sm:pt-2')}>
                    {REQUEST_COPY.intakeHaveAccount} {link}
                </p>
            ) : (
                <span className="text-sm">{link}</span>
            )}
            <LoginDialog open={open} onOpenChange={setOpen} />
        </>
    );
}
