'use client';

import type {ComponentProps} from 'react';
import {Loader2, X} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';

type CloseButtonProps = {
    /** Accessible name — required; the control has no text label. */
    'aria-label': string;
    /** Tooltip / hover title — defaults to the aria-label when omitted. */
    title?: string;
    onClick: ComponentProps<'button'>['onClick'];
    disabled?: boolean;
    /** Shows a spinner in place of the X (e.g. while leaving a request). */
    busy?: boolean;
    /** Placement only — size and color stay fixed. */
    className?: string;
};

/**
 * Shell close control — 48px solid foreground circle, light X, no shadow.
 * Same size and color as the compare page close and the chat FAB.
 * Props-only: callers supply the label and leave handler.
 */
export function CloseButton({
    'aria-label': ariaLabel,
    title,
    onClick,
    disabled = false,
    busy = false,
    className,
}: CloseButtonProps) {
    return (
        <Button
            type="button"
            size="icon"
            className={cn(
                'size-12 rounded-full border-0 bg-foreground text-background shadow-none hover:bg-foreground hover:opacity-90',
                className,
            )}
            onClick={onClick}
            aria-label={ariaLabel}
            title={title ?? ariaLabel}
            disabled={disabled || busy}
        >
            {busy ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
                <Icon icon={X} size="md" />
            )}
        </Button>
    );
}
