'use client';

import type {ReactNode} from 'react';
import Link from 'next/link';
import {ArrowRight, CircleCheck, X} from 'lucide-react';
import {toast} from 'sonner';
import {cn} from '@pakfactory/ui/lib/utils';

type ToastCardAction = {
    label: string;
    href: string;
};

export type ToastCardProps = {
    title: string;
    /** Optional supporting line under the title. */
    description?: string;
    /** Rendered as an underlined link below the text, not a button beside it. */
    action?: ToastCardAction;
    /** Defaults to a check in a circle. Pass a node to swap the glyph. */
    icon?: ReactNode;
    dismissLabel: string;
    onDismiss: () => void;
    className?: string;
};

/**
 * The house toast surface. Presentational and props-only: no copy, routes, or
 * feature imports, so any lane can compose it (ADR-013).
 *
 * Rendered through `toast.custom`, which opts out of sonner's own layout,
 * surface styling, and close button - hence the border/shadow and the X here.
 */
export function ToastCard({
    title,
    description,
    action,
    icon,
    dismissLabel,
    onDismiss,
    className,
}: ToastCardProps) {
    return (
        <div
            role="status"
            className={cn(
                'flex w-[356px] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-2xl border border-border bg-background p-4 shadow-lg',
                className,
            )}
        >
            <span className="mt-0.5 shrink-0 text-foreground" aria-hidden>
                {icon ?? <CircleCheck className="size-5" strokeWidth={1.75} />}
            </span>

            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{title}</p>
                {description ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                        {description}
                    </p>
                ) : null}
                {action ? (
                    <Link
                        href={action.href}
                        onClick={onDismiss}
                        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-foreground underline underline-offset-4"
                    >
                        {action.label}
                        <ArrowRight className="size-4" aria-hidden />
                    </Link>
                ) : null}
            </div>

            <button
                type="button"
                onClick={onDismiss}
                aria-label={dismissLabel}
                className="-m-1 shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
                <X className="size-4" aria-hidden />
            </button>
        </div>
    );
}

/**
 * Shows a ToastCard and wires its dismiss to sonner, so call sites stay a
 * single call and never touch the toast id.
 */
export function showToastCard(props: Omit<ToastCardProps, 'onDismiss'>) {
    return toast.custom((id) => (
        <ToastCard {...props} onDismiss={() => toast.dismiss(id)} />
    ));
}
