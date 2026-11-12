'use client';

import type {ReactNode} from 'react';
import {cn} from '@pakfactory/ui/lib/utils';

import Logo from '@/components/layout/logo';
import {CloseButton} from '@/components/ui/close-button';
import {REQUEST_COPY} from '@/lib/copy/request';

type RequestTopBarProps = {
    /** Left of the bar, after the logo (flow name, editable draft title, …). */
    title: ReactNode;
    /** Logo and Close both leave the flow; the owner decides whether to confirm first. */
    onLeave: () => void;
    disabled?: boolean;
    leaving?: boolean;
    /** Sign in (or the buyer’s name) before Close, separated by a pipe. */
    beforeClose?: ReactNode;
};

/** Request shell header: logo · title · Sign in · Close. */
export function RequestTopBar({
    title,
    onLeave,
    disabled = false,
    leaving = false,
    beforeClose,
}: RequestTopBarProps) {
    return (
        <header
            className={cn(
                'sticky top-0 z-20 flex h-[68px] items-center gap-4 border-b border-border bg-background px-4 sm:px-6 lg:px-8',
                // pr-5 = right-5 so the close control lines up with the chat FAB edge.
                'pr-5 sm:pr-5 lg:pr-5',
            )}
        >
            <div className="flex min-w-0 items-center gap-2">
                <button
                    type="button"
                    className="shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={REQUEST_COPY.logoBackAria}
                    disabled={disabled}
                    onClick={onLeave}
                >
                    <Logo />
                </button>
                <span className="text-border" aria-hidden>
                    |
                </span>
                {title}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-4">
                {beforeClose}
                {beforeClose ? (
                    <span className="text-border" aria-hidden>
                        |
                    </span>
                ) : null}
                <CloseButton
                    aria-label={REQUEST_COPY.close}
                    title={REQUEST_COPY.close}
                    disabled={disabled}
                    busy={leaving}
                    onClick={onLeave}
                />
            </div>
        </header>
    );
}
