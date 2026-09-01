'use client';

import Link from 'next/link';
import {Columns2, PackageIcon, Share2} from 'lucide-react';

import {BookmarkIconButton} from '@/components/ui/bookmark-icon-button';
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
    const moq = data.moq ?? '—';
    const leadTime = data.leadTime ?? '—';

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
                        <span className="flex size-full items-center justify-center">
                            <PackageIcon
                                className="size-12 text-muted-foreground opacity-40"
                                aria-hidden
                            />
                        </span>
                    )}
                </Link>
            }
            bookmark={
                <BookmarkIconButton
                    onClick={stubBookmarkAction}
                    ariaLabel="Bookmark product"
                />
            }
            meta={
                <div className="space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                        {eyebrow ? (
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {eyebrow}
                            </span>
                        ) : (
                            <span />
                        )}
                        <IconActionRow
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
                    </div>
                    <Link
                        href={data.href}
                        className="block rounded outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">
                            {data.title}
                        </h3>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                            MOQ {moq} · Delivery {leadTime}
                        </p>
                    </Link>
                </div>
            }
        />
    );
}
