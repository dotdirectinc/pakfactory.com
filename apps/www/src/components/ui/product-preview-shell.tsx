'use client';

import type {ReactNode} from 'react';
import {X} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@pakfactory/ui/components/dialog';

import {Icon} from '@/components/ui/icon';

export type ProductPreviewShellProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    /** Left column media well (aspect-square). */
    media: ReactNode;
    /** Below media — typically “View product details”. */
    mediaFooter?: ReactNode;
    /** Right rail body; scrolls inside min/max height. */
    children: ReactNode;
};

/**
 * Props-only dialog chrome for product quick views (ADR-013).
 * Kind-specific previews own right-rail content; this shell owns layout + scrollport.
 */
export function ProductPreviewShell({
    open,
    onOpenChange,
    title,
    media,
    mediaFooter,
    children,
}: ProductPreviewShellProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="flex max-h-[min(92vh,56rem)] w-[min(96vw,42rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl md:min-w-[64rem]"
                showCloseButton={false}
                aria-describedby={undefined}
            >
                <DialogHeader className="relative shrink-0 border-b border-border px-6 py-4 pr-14 text-left">
                    <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                        {title}
                    </DialogTitle>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="absolute top-1/2 right-4 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden"
                    >
                        <Icon icon={X} size="sm" />
                        <span className="sr-only">Close</span>
                    </button>
                </DialogHeader>

                <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden p-6 lg:grid-cols-2 lg:gap-8">
                    <div className="flex min-w-0 flex-col gap-4">
                        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
                            {media}
                        </div>
                        {mediaFooter}
                    </div>

                    {/*
                      Right rail shares the grid row height with the left column
                      (media + CTA). Overflow scrolls inside min-h-0 flex child.
                    */}
                    <div className="flex min-h-0 min-w-0 flex-col overflow-hidden lg:h-full lg:max-h-full">
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-x-hidden overflow-y-auto overscroll-contain pr-1">
                            {children}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
