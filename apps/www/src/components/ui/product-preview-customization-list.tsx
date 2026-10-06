'use client';

import Link from 'next/link';

import {BookmarkIconButton} from '@/components/ui/bookmark-icon-button';
import {SanityImage} from '@/components/ui/sanity-image';
import {stubBookmarkAction} from '@/lib/catalog-card-actions';
import {isSanityCdnUrl} from '@/lib/sanity/image';

export type ProductPreviewCustomizationItem = {
    id: string;
    category: string;
    title: string;
    description: string;
    learnMoreHref: string;
    imageSrc?: string | null;
    imageAlt?: string;
};

type ProductPreviewCustomizationListProps = {
    items: ProductPreviewCustomizationItem[];
    emptyMessage?: string;
};

/**
 * Props-only customizations rows for product preview dialogs.
 */
export function ProductPreviewCustomizationList({
    items,
    emptyMessage = 'Open the product page for customization details.',
}: ProductPreviewCustomizationListProps) {
    if (items.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        );
    }

    return (
        <ul className="flex flex-col">
            {items.map((item) => (
                <li
                    key={item.id}
                    className="flex gap-4 border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0"
                >
                    <span
                        className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted"
                        aria-hidden
                    >
                        {item.imageSrc ? (
                            isSanityCdnUrl(item.imageSrc) ? (
                                <SanityImage
                                    src={item.imageSrc}
                                    alt={item.imageAlt || item.title}
                                    fill
                                    square
                                    sizes="48px"
                                    className="object-cover"
                                />
                            ) : (
                                // eslint-disable-next-line @next/next/no-img-element -- local / non-CDN
                                <img
                                    src={item.imageSrc}
                                    alt={item.imageAlt || item.title}
                                    className="size-full object-cover"
                                />
                            )
                        ) : null}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex flex-col gap-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {item.category}
                            </p>
                            <h3 className="text-sm font-semibold tracking-tight text-foreground">
                                {item.title}
                            </h3>
                            <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                                {item.description}
                            </p>
                        </div>
                        <Link
                            href={item.learnMoreHref}
                            className="inline-block text-sm font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
                        >
                            Learn More
                        </Link>
                    </div>
                    <BookmarkIconButton
                        className="shrink-0"
                        ariaLabel={`Bookmark ${item.title}`}
                        onClick={stubBookmarkAction}
                    />
                </li>
            ))}
        </ul>
    );
}
