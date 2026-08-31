'use client';

import type {MouseEvent} from 'react';
import {Bookmark} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

type BookmarkIconButtonProps = {
    pressed?: boolean;
    onClick: (event: MouseEvent<HTMLButtonElement>) => void;
    ariaLabel?: string;
    className?: string;
};

export function BookmarkIconButton({
    pressed = false,
    onClick,
    ariaLabel,
    className,
}: BookmarkIconButtonProps) {
    const label =
        ariaLabel ?? (pressed ? 'Remove bookmark' : 'Bookmark');

    return (
        <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={label}
            aria-pressed={pressed}
            className={cn(
                'size-8 rounded-full border bg-background/90 shadow-none',
                'transition-[color,border-color,background-color] duration-500 ease-in-out',
                'hover:border-foreground hover:bg-muted hover:text-foreground',
                className,
            )}
            onClick={onClick}
        >
            <Bookmark
                className={cn('size-4', pressed && 'fill-current')}
                aria-hidden
            />
        </Button>
    );
}
