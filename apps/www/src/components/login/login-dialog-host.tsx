'use client';

import {useEffect, useState} from 'react';

import {LoginDialog} from '@/components/login/login-dialog';

type LoginDialogRequest = {
    open: boolean;
    next?: string;
    /** Called when the user closes the dialog without completing auth. */
    onDismiss?: () => void;
};

let dialogState: LoginDialogRequest = {open: false};
const listeners = new Set<() => void>();

function emit(): void {
    for (const listener of listeners) listener();
}

/**
 * Open the site-wide Welcome-back login dialog (e.g. bookmark gate).
 * Mount {@link LoginDialogHost} once under the root client shell.
 */
export function openLoginDialog(options: {
    next?: string;
    onDismiss?: () => void;
}): void {
    dialogState = {
        open: true,
        next: options.next,
        onDismiss: options.onDismiss,
    };
    emit();
}

function closeLoginDialog(didDismiss: boolean): void {
    const {onDismiss} = dialogState;
    dialogState = {open: false};
    emit();
    if (didDismiss) onDismiss?.();
}

/** Imperative host for {@link openLoginDialog}. */
export function LoginDialogHost() {
    const [snapshot, setSnapshot] = useState<LoginDialogRequest>(dialogState);

    useEffect(() => {
        const sync = () => setSnapshot({...dialogState});
        listeners.add(sync);
        sync();
        return () => {
            listeners.delete(sync);
        };
    }, []);

    return (
        <LoginDialog
            open={snapshot.open}
            next={snapshot.next}
            onOpenChange={(open) => {
                if (!open) closeLoginDialog(true);
            }}
        />
    );
}
