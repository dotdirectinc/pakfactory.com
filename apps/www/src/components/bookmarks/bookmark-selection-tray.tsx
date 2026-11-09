'use client';

import Link from 'next/link';
import {X} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

import {SanityImage} from '@/components/ui/sanity-image';
import type {BookmarkEntry} from '@/lib/bookmarks/bookmarks';
import {isSanityCdnUrl} from '@/lib/sanity/image';

type BookmarkSelectionTrayProps = {
    selected: BookmarkEntry[];
    onRemove: (entry: BookmarkEntry) => void;
    onClear: () => void;
    onAddProducts: () => void;
    onApplyCustomization: () => void;
    className?: string;
};

/**
 * Bottom tray on `/bookmarks` when one or more items are selected.
 * Products → Add to request; a single customization → Apply to a product.
 */
export function BookmarkSelectionTray({
    selected,
    onRemove,
    onClear,
    onAddProducts,
    onApplyCustomization,
    className,
}: BookmarkSelectionTrayProps) {
    const count = selected.length;
    if (count === 0) return null;

    const products = selected.filter((e) => e.type === 'product');
    const customizations = selected.filter((e) => e.type === 'customization');
    const canAddProducts = products.length > 0;
    const canApply = customizations.length === 1;

    return (
        <div
            className={cn(
                'fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-b-0 border-border bg-background shadow-[0_-12px_40px_rgba(0,0,0,0.1)]',
                className,
            )}
            role="region"
            aria-label="Bookmark selection"
        >
            <div className="mx-auto flex w-full max-w-[var(--layout-max)] flex-col gap-4 px-layout-gutter-inner py-4 lg:flex-row lg:items-center lg:gap-6">
                <div className="shrink-0 lg:min-w-[160px]">
                    <p className="text-base font-semibold text-foreground">
                        {count} selected
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Products go into the open request. One customization
                        opens Apply to a product.
                    </p>
                </div>

                <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
                    {selected.map((item) => (
                        <div
                            key={`${item.type}:${item.id}`}
                            className="flex min-w-0 shrink-0 items-center gap-2 rounded-2xl border border-border bg-background px-2 py-2"
                        >
                            <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                                {item.snapshot.imageUrl &&
                                isSanityCdnUrl(item.snapshot.imageUrl) ? (
                                    <SanityImage
                                        src={item.snapshot.imageUrl}
                                        alt={
                                            item.snapshot.imageAlt ||
                                            item.snapshot.title
                                        }
                                        fill
                                        square
                                        sizes="40px"
                                        className="object-cover"
                                    />
                                ) : null}
                            </span>
                            <Link
                                href={item.snapshot.href}
                                className="max-w-[140px] truncate text-sm font-medium text-foreground underline-offset-4 hover:underline"
                            >
                                {item.snapshot.title}
                            </Link>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Remove ${item.snapshot.title}`}
                                onClick={() => onRemove(item)}
                            >
                                <X className="size-4" />
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button type="button" variant="ghost" onClick={onClear}>
                        Clear
                    </Button>
                    {canApply ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onApplyCustomization}
                        >
                            Apply to a product
                        </Button>
                    ) : null}
                    {canAddProducts ? (
                        <Button type="button" onClick={onAddProducts}>
                            Add to Quote
                            {products.length > 1
                                ? ` (${products.length})`
                                : ''}
                        </Button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
