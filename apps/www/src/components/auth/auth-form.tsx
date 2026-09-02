'use client';

import {useActionState} from 'react';
import {useFormStatus} from 'react-dom';
import {Button} from '@pakfactory/ui/components/button';
import type {ActionState} from '@/lib/auth/actions';

type AuthAction = (prev: ActionState, form: FormData) => Promise<ActionState>;

type AuthFormProps = {
    action: AuthAction;
    submitLabel: string;
    children: React.ReactNode;
};

/**
 * Shared shell for the five auth forms (PROD-1426).
 *
 * Fields stay uncontrolled and are passed as children: a Server Action posts the
 * FormData directly, so React never needs the values in state, and what the buyer
 * typed survives a failed submit because the DOM nodes are not remounted.
 */
export function AuthForm({action, submitLabel, children}: AuthFormProps) {
    const [state, formAction] = useActionState(action, {});

    return (
        <form action={formAction} className="flex flex-col gap-4">
            {children}

            {state.error ? (
                // role="alert" so a screen reader announces the failure instead of
                // leaving the buyer waiting on a form that silently did nothing.
                <p
                    role="alert"
                    className="text-destructive text-sm leading-relaxed"
                >
                    {state.error}
                </p>
            ) : null}

            <SubmitButton label={submitLabel} />
        </form>
    );
}

/**
 * Split out because useFormStatus only reports the pending state of a form
 * ABOVE it in the tree — called in AuthForm itself it would always read false.
 */
function SubmitButton({label}: {label: string}) {
    const {pending} = useFormStatus();

    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Working…' : label}
        </Button>
    );
}
