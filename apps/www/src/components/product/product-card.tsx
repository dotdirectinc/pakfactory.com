'use client';

import {useState, type MouseEvent} from 'react';
import Link from 'next/link';
import {Columns2, Package, Share2} from 'lucide-react';

import {BookmarkIconButton} from '@/components/ui/bookmark-icon-button';
import {Icon} from '@/components/ui/icon';
import {IconActionRow} from '@/components/ui/icon-action-row';
import {MediaCardFrame} from '@/components/ui/media-card-frame';
import {SanityImage} from '@/components/ui/sanity-image';
import {
    sharePageUrl,
    stubBookmarkAction,
    stubCompareAction,
} from '@/lib/catalog-card-actions';

export type ProductCardData = {
    title: string;
    href: string;
    sku?: string;
    eyebrowLabel?: string;
    imageUrl?: string | null;
    imageAlt?: string;
    moq?: number | string;
    leadTime?: string;
};

type ProductCardProps = {
    data: ProductCardData;
};

export function ProductCard({data}: ProductCardProps) {
    const eyebrow = (data.sku ?? data.eyebrowLabel ?? '').toUpperCase();
    const [saved, setSaved] = useState(false);

    function handleBookmark(event: MouseEvent<HTMLButtonElement>) {
        stubBookmarkAction(event);
        setSaved((prev) => !prev);
    }

    return (
        <MediaCardFrame
            media={
                <Link
                    href={data.href}
                    className="absolute inset-0 z-0 block outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {data.imageUrl ? (
                        <SanityImage
                            src={data.imageUrl}
                            alt={data.imageAlt ?? data.title}
                            applyWatermark
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                            className="object-cover"
                        />
                    ) : (
                        <span className="flex size-full items-center justify-center bg-muted/40">
                            <Icon
                                icon={Package}
                                className="size-8 text-muted-foreground/50"
                            />
                        </span>
                    )}
                </Link>
            }
            bookmark={
                <BookmarkIconButton
                    pressed={saved}
                    onClick={handleBookmark}
                    ariaLabel="Bookmark product"
                />
            }
            meta={
                <div className="relative space-y-0.5 pr-12">
                    <IconActionRow
                        className="absolute top-0 right-0"
                        actions={[
                            {
                                id: 'share',
                                label: 'Share',
                                ariaLabel: 'Share',
                                icon: Share2,
                                onClick: (event) =>
                                    sharePageUrl(event, data.href),
                            },
                            {
                                id: 'compare',
                                label: 'Compare',
                                ariaLabel: 'Compare',
                                icon: Columns2,
                                onClick: stubCompareAction,
                            },
                        ]}
                    />
                    {eyebrow ? (
                        <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {eyebrow}
                        </span>
                    ) : null}
                    <Link
                        href={data.href}
                        className="block min-w-0 rounded outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground">
                            {data.title}
                        </h3>
                    </Link>
                </div>
            }
        />
    );
}
