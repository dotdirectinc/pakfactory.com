'use client';

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
import {customizationCategoryHref} from '@/lib/www-routes';

export type CustomizationCardData = {
    _id: string;
    title: string;
    slug: string;
    /** Sanity customizationCategory.slug */
    categoryValue: string;
    categoryLabel?: string;
    imageUrl?: string | null;
    imageAlt?: string | null;
};

type CustomizationCardProps = {
    item: CustomizationCardData;
};

export function CustomizationCard({item}: CustomizationCardProps) {
    const href = customizationCategoryHref(item.categoryValue, item.slug);
    const eyebrow = (item.categoryLabel ?? item.categoryValue).toUpperCase();

    return (
        <MediaCardFrame
            media={
                <Link
                    href={href}
                    className="absolute inset-0 z-0 block outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {item.imageUrl ? (
                        <SanityImage
                            src={item.imageUrl}
                            alt={item.imageAlt ?? item.title}
                            applyWatermark={false}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 20vw"
                            className="object-cover"
                        />
                    ) : (
                        <span className="flex size-full items-center justify-center">
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
                    onClick={stubBookmarkAction}
                    ariaLabel="Bookmark customization"
                />
            }
            meta={
                <div className="space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {eyebrow}
                        </span>
                        <IconActionRow
                            actions={[
                                {
                                    id: 'share',
                                    label: 'Share',
                                    ariaLabel: 'Share',
                                    icon: Share2,
                                    onClick: (event) =>
                                        sharePageUrl(event, href),
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
                        href={href}
                        className="block rounded outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">
                            {item.title}
                        </h3>
                    </Link>
                </div>
            }
        />
    );
}
