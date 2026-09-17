'use client';

import Link from 'next/link';
import {Package} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@pakfactory/ui/components/dialog';

import type {CustomizationPreviewItem} from '@/components/product/map-customization-preview-items';
import {Icon} from '@/components/ui/icon';
import {SanityImage} from '@/components/ui/sanity-image';

const OVERVIEW_ANCHOR_ID = 'pdp-overview';

type CustomizationQuickViewProps = {
    item: CustomizationPreviewItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

/**
 * Materials & finishes quick view — image + copy + Learn more / Customize.
 * Color range deferred until option fields are on the catalog seam.
 */
export function CustomizationQuickView({
    item,
    open,
    onOpenChange,
}: CustomizationQuickViewProps) {
    const eyebrow = item?.typeTitle ?? item?.categoryTitle;

    function handleCustomize() {
        onOpenChange(false);
        document
            .getElementById(OVERVIEW_ANCHOR_ID)
            ?.scrollIntoView({behavior: 'smooth', block: 'start'});
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-h-[min(92vh,56rem)] w-[min(96vw,42rem)] max-w-none overflow-y-auto md:min-w-[64rem]"
                aria-describedby={undefined}
            >
                {item ? (
                    <>
                        <DialogHeader className="sr-only">
                            <DialogTitle>{item.label}</DialogTitle>
                            {item.description ? (
                                <DialogDescription>
                                    {item.description}
                                </DialogDescription>
                            ) : null}
                        </DialogHeader>

                        <div className="mt-2 grid gap-6 lg:mt-0 lg:grid-cols-2 lg:items-stretch">
                            <div className="flex min-w-0 flex-col gap-4 rounded-2xl bg-muted/30 p-3 sm:p-4">
                                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
                                    {item.imageUrl ? (
                                        <SanityImage
                                            src={item.imageUrl}
                                            alt={item.imageAlt ?? item.label}
                                            applyWatermark
                                            fill
                                            sizes="(max-width: 1024px) 100vw, 50vw"
                                            className="object-cover"
                                        />
                                    ) : (
                                        <span className="flex size-full items-center justify-center">
                                            <Icon
                                                icon={Package}
                                                className="size-10 text-muted-foreground/50"
                                            />
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex h-full min-w-0 flex-col gap-3 pt-1">
                                <div className="flex min-w-0 flex-col gap-3">
                                    {eyebrow ? (
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            {eyebrow}
                                        </p>
                                    ) : null}
                                    <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                                        {item.label}
                                    </h2>
                                    {item.description ? (
                                        <p className="text-sm text-muted-foreground">
                                            {item.description}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="mt-auto flex flex-wrap items-center justify-end gap-x-4 gap-y-2 pt-4 sm:flex-nowrap">
                                    <Link
                                        href={item.href}
                                        className="text-sm font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
                                    >
                                        Learn more
                                    </Link>
                                    <Button
                                        type="button"
                                        className="h-10 cursor-pointer rounded-xl px-5 text-sm font-medium"
                                        onClick={handleCustomize}
                                    >
                                        Customize this option
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
