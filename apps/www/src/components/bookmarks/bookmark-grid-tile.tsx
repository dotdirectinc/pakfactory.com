'use client';

import type {MouseEvent} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Bookmark} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {Checkbox} from '@pakfactory/ui/components/checkbox';
import {cn} from '@pakfactory/ui/lib/utils';

import {BookmarkIconButton} from '@/components/ui/bookmark-icon-button';
import {Icon} from '@/components/ui/icon';
import {MediaCardFrame} from '@/components/ui/media-card-frame';
import {SanityImage} from '@/components/ui/sanity-image';
import {useQuickConfigure} from '@/components/quick-configure/quick-configure';
import {runBookmarkToggle} from '@/lib/bookmarks/bookmark-actions';
import {type BookmarkEntry} from '@/lib/bookmarks/bookmarks';
import {useBookmarkAuth} from '@/lib/bookmarks/use-bookmark-auth';
import {isSanityCdnUrl} from '@/lib/sanity/image';
import {stopCardAction} from '@/lib/catalog-card-actions';

function selectionKey(entry: BookmarkEntry): string {
    return `${entry.type}:${entry.id}`;
}

function eyebrowFor(entry: BookmarkEntry): string {
    if (entry.type === 'product') {
        return entry.snapshot.sku || 'Product';
    }
    return (
        entry.snapshot.typeTitle ||
        entry.snapshot.categoryValue ||
        'Customization'
    );
}

type BookmarkGridTileProps = {
    entry: BookmarkEntry;
    selected: boolean;
    onToggleSelect: () => void;
    onApplyCustomization: () => void;
    className?: string;
};

/**
 * Bookmarks v1 grid tile — composes {@link MediaCardFrame} like catalog cards,
 * with selection for the tray plus Add to request / Apply CTAs.
 */
export function BookmarkGridTile({
    entry,
    selected,
    onToggleSelect,
    onApplyCustomization,
    className,
}: BookmarkGridTileProps) {
    const pathname = usePathname() || '/bookmarks';
    const {canBookmark, loginHref} = useBookmarkAuth();
    const quick = useQuickConfigure();
    const key = selectionKey(entry);
    const snap = entry.snapshot;
    const eyebrow = eyebrowFor(entry);

    function handleBookmark(event: MouseEvent<HTMLButtonElement>) {
        runBookmarkToggle(
            event,
            {
                type: entry.type,
                id: entry.id,
                snapshot: snap,
            },
            {allowed: canBookmark, loginHref: loginHref(pathname)},
        );
    }

    const bookmarkButton = (
        <span>
            <BookmarkIconButton
                pressed
                onClick={handleBookmark}
                ariaLabel="Remove bookmark"
                tooltipSide="bottom"
            />
        </span>
    );

    const media =
        snap.imageUrl && isSanityCdnUrl(snap.imageUrl) ? (
            <SanityImage
                src={snap.imageUrl}
                alt={snap.imageAlt || snap.title}
                fill
                square
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover"
            />
        ) : (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <Icon
                    icon={Bookmark}
                    className="size-8 text-muted-foreground/50"
                />
            </div>
        );

    const mediaOverlay = (
        <>
            <Link
                href={snap.href}
                className="absolute inset-0 z-0 block outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={snap.title}
            />
            <label
                className="absolute top-2 left-2 z-20 flex cursor-pointer items-center rounded-md bg-background/90 p-1 shadow-sm"
                htmlFor={`bm-select-${key}`}
                onClick={(e) => e.stopPropagation()}
            >
                <Checkbox
                    id={`bm-select-${key}`}
                    checked={selected}
                    onCheckedChange={() => onToggleSelect()}
                    aria-label={`Select ${snap.title}`}
                />
            </label>
        </>
    );

    const showQuickAdd =
        entry.type === 'product' && quick.enabled && Boolean(entry.id);
    const showApply = entry.type === 'customization';

    return (
        <li className={cn('min-h-0 h-full', className)}>
            <MediaCardFrame
                className="h-full"
                bookmarkPressed
                media={media}
                mediaOverlay={mediaOverlay}
                bookmark={bookmarkButton}
                meta={
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {eyebrow}
                            </span>
                            <div className="flex shrink-0 items-center gap-2 sm:hidden">
                                {bookmarkButton}
                            </div>
                        </div>
                        <Link
                            href={snap.href}
                            className="block min-w-0 rounded outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
                                {snap.title}
                            </span>
                        </Link>
                        {snap.productLineTitle ? (
                            <p className="text-xs text-muted-foreground">
                                {snap.productLineTitle}
                            </p>
                        ) : null}
                        {showQuickAdd ? (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="mt-2 w-full sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 motion-reduce:sm:opacity-100"
                                onClick={(event) => {
                                    stopCardAction(event);
                                    quick.open({
                                        slug: entry.id,
                                        title: snap.title,
                                    });
                                }}
                            >
                                Add to Quote
                            </Button>
                        ) : null}
                        {showApply ? (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="mt-2 w-full sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 motion-reduce:sm:opacity-100"
                                onClick={(event) => {
                                    stopCardAction(event);
                                    onApplyCustomization();
                                }}
                            >
                                Apply to a product
                            </Button>
                        ) : null}
                    </div>
                }
            />
        </li>
    );
}
