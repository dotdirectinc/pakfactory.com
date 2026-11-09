'use client';

import type {ReactNode} from 'react';
import {Loader2, X} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';
import Logo from '@/components/layout/logo';
import {REQUEST_COPY} from '@/lib/copy/request';

type WizardTopBarProps = {
    /** Left of the bar, after the logo (flow name, editable draft title, …). */
    title: ReactNode;
    /** Logo and Close both leave the flow; the owner decides whether to confirm first. */
    onLeave: () => void;
    disabled?: boolean;
    leaving?: boolean;
    /**
     * Step intake (owner Nov 2): a Sign in link before Close, and Close as a round icon button,
     * so leaving and signing in never look alike.
     */
    beforeClose?: ReactNode;
    roundClose?: boolean;
};

/** Props-only top bar for focused flows (Brief Builder, step shell): logo · title · Close. */
export function WizardTopBar({title, onLeave, disabled = false, leaving = false, beforeClose, roundClose = false}: WizardTopBarProps) {
    return (
        <header
            className={cn(
                'sticky top-0 z-20 flex h-[68px] items-center gap-4 border-b border-border bg-background px-4 sm:px-6 lg:px-8',
                // Round Close matches chat FAB (size-12 / 48px); pr-5 = right-5 so it lines up with the FAB.
                roundClose && 'pr-5 sm:pr-5 lg:pr-5',
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
                {/* Owner Nov 2: a pipe between Sign in / the buyer's name and Close. */}
                {beforeClose ? (
                    <span className="text-border" aria-hidden>
                        |
                    </span>
                ) : null}
                {roundClose ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-12 rounded-full bg-muted text-foreground hover:bg-muted/70"
                        aria-label={REQUEST_COPY.close}
                        title={REQUEST_COPY.close}
                        disabled={disabled}
                        onClick={onLeave}
                    >
                        {leaving ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <X className="size-5" aria-hidden />}
                    </Button>
                ) : (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                    disabled={disabled}
                    onClick={onLeave}
                >
                    {leaving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <X className="size-4" aria-hidden />}
                    {REQUEST_COPY.close}
                </Button>
                )}
            </div>
        </header>
    );
}
