'use client';

import {useState} from 'react';
import Link from 'next/link';
import {useLinkStatus} from 'next/link';
import {Package} from 'lucide-react';

import {Button} from '@pakfactory/ui/components/button';
import {Badge} from '@pakfactory/ui/components/badge';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';
import {MediaCardFrame} from '@/components/ui/media-card-frame';
import {SanityImage} from '@/components/ui/sanity-image';
import {displayProductSku} from '@/lib/catalog/display-sku';

export type ProductCapabilityCardData = {
    title: string;
    href: string;
    sku?: string;
    imageUrl?: string | null;
    imageAlt?: string;
};

type ProductCapabilityCardProps = {
    data: ProductCapabilityCardData;
    /** When true, shows the black “Your request” badge on the media. */
    inRequest?: boolean;
    priority?: boolean;
    applyWatermark?: boolean;
    /**
     * `elevated` — white media well on a muted band (`MediaCardFrame` surface).
     */
    surface?: 'default' | 'elevated';
};

/**
 * Compatibility / Works with product tile (PROD-2921).
 * Shared UI for all capability matches: Apply on hover, optional in-request badge —
 * no bookmark/compare utilities.
 */
export function ProductCapabilityCard({
    data,
    inRequest = false,
    priority = false,
    applyWatermark = false,
    surface = 'default',
}: ProductCapabilityCardProps) {
    // Strip ?query so compatibility handoff hrefs don't pollute the slug.
    const pathOnly = data.href.split('?')[0] ?? '';
    const slugFromHref = pathOnly.split('/').filter(Boolean).pop() ?? '';
    const eyebrow = displayProductSku(data.sku, slugFromHref).toUpperCase();
    const [prefetch, setPrefetch] = useState(false);

    function enablePrefetch() {
        setPrefetch(true);
    }

    const media = data.imageUrl ? (
        <div className="pointer-events-none absolute inset-0">
            <SanityImage
                src={data.imageUrl}
                alt={data.imageAlt ?? data.title}
                applyWatermark={applyWatermark}
                fill
                priority={priority}
                square
                sizes="(max-width: 640px) 96px, (max-width: 1280px) 50vw, 25vw"
                className="object-cover"
            />
        </div>
    ) : (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Icon
                icon={Package}
                className="size-8 text-muted-foreground/50"
            />
        </div>
    );

    const mediaOverlay = (
        <>
            <Link
                href={data.href}
                prefetch={prefetch}
                onPointerEnter={enablePrefetch}
                onPointerDown={enablePrefetch}
                onFocus={enablePrefetch}
                className="absolute inset-0 z-0 block outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={data.title}
            />
            <div
                className={cn(
                    'pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-4',
                    'opacity-0 transition-opacity duration-200',
                    'group-hover:opacity-100 group-focus-within:opacity-100',
                    'motion-reduce:opacity-100',
                )}
            >
                <Button
                    asChild
                    size="sm"
                    className="pointer-events-auto h-9 px-6 shadow-sm"
                >
                    <Link
                        href={data.href}
                        prefetch={prefetch}
                        onPointerEnter={enablePrefetch}
                        onPointerDown={enablePrefetch}
                        onFocus={enablePrefetch}
                    >
                        Apply
                    </Link>
                </Button>
            </div>
        </>
    );

    return (
        <MediaCardFrame
            surface={surface}
            media={media}
            mediaOverlay={mediaOverlay}
            statusBadge={
                inRequest ? (
                    <Badge variant="default" className="pointer-events-none">
                        Your request
                    </Badge>
                ) : undefined
            }
            meta={
                <div className="space-y-0.5">
                    {eyebrow ? (
                        <span className="block truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {eyebrow}
                        </span>
                    ) : null}
                    <Link
                        href={data.href}
                        prefetch={prefetch}
                        onPointerEnter={enablePrefetch}
                        onPointerDown={enablePrefetch}
                        onFocus={enablePrefetch}
                        className="block min-w-0 rounded outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <CapabilityCardTitle title={data.title} />
                    </Link>
                </div>
            }
        />
    );
}

function CapabilityCardTitle({title}: {title: string}) {
    const {pending} = useLinkStatus();
    return (
        <h3
            className={cn(
                'line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground transition-opacity duration-200',
                pending && 'opacity-70',
            )}
        >
            {title}
        </h3>
    );
}
