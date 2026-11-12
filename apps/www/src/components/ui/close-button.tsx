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
 * Shell close control — ghost Button + 36px muted circle, foreground X, no shadow.
 * Shared by request top bar and compare. Props-only: callers supply the label and leave handler.
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
            variant="ghost"
            size="icon"
            className={cn(
                'size-9 rounded-full border-0 bg-muted text-foreground shadow-none hover:bg-muted/80 hover:text-foreground',
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
