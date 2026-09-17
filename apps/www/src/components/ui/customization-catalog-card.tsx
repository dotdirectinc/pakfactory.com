'use client';

import Link from 'next/link';
import {Package} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';
import {MediaCardFrame} from '@/components/ui/media-card-frame';
import {SanityImage} from '@/components/ui/sanity-image';

export type CustomizationCatalogCardProps = {
    href: string;
    title: string;
    description?: string;
    eyebrow?: string;
    imageSrc?: string | null;
    imageAlt?: string;
    className?: string;
    onCloserLook: () => void;
    /**
     * `container` — whole media surface opens quick view (default).
     * `action` — only the "Take a closer look" control opens quick view.
     */
    mediaClickTarget?: 'container' | 'action';
};

const closerLookPillClass = cn(
    'relative z-1 inline-flex h-auto w-full max-w-50 items-center justify-center',
    'rounded-2xl bg-black/45 px-4 py-2 text-xs font-medium text-white sm:text-sm',
);

const hoverLayerClass = cn(
    'flex size-full items-end justify-center p-4',
    'opacity-0 transition-opacity duration-200',
    'group-hover:opacity-100 group-focus-within:opacity-100',
    'motion-reduce:transition-none',
);

/**
 * PDP Materials & finishes browse tile — transactional MediaCardFrame (like ProductCard)
 * without bookmark/compare; media opens quick view via onCloserLook.
 */
export function CustomizationCatalogCard({
    href,
    title,
    description,
    eyebrow,
    imageSrc,
    imageAlt,
    className,
    onCloserLook,
    mediaClickTarget = 'container',
}: CustomizationCatalogCardProps) {
    const closerLookLabel = `Take a closer look at ${title}`;

    const media = (
        <div className="pointer-events-none absolute inset-0">
            {imageSrc ? (
                <SanityImage
                    src={imageSrc}
                    alt={imageAlt ?? title}
                    applyWatermark
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
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
        </div>
    );

    const mediaOverlay =
        mediaClickTarget === 'container' ? (
            <button
                type="button"
                aria-label={closerLookLabel}
                className="absolute inset-0 z-10 cursor-pointer border-0 bg-transparent p-0"
                onClick={onCloserLook}
            >
                <span
                    className={cn(
                        hoverLayerClass,
                        'pointer-events-none relative size-full',
                    )}
                >
                    <span aria-hidden className={closerLookPillClass}>
                        Take a closer look
                    </span>
                </span>
            </button>
        ) : (
            <div className={cn(hoverLayerClass, 'absolute inset-0')}>
                <Button
                    type="button"
                    variant="ghost"
                    tabIndex={0}
                    aria-label={closerLookLabel}
                    className={cn(
                        closerLookPillClass,
                        'cursor-pointer shadow-none hover:bg-black/55 hover:text-white',
                    )}
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onCloserLook();
                    }}
                >
                    Take a closer look
                </Button>
            </div>
        );

    return (
        <MediaCardFrame
            className={cn('h-full', className)}
            media={media}
            mediaOverlay={mediaOverlay}
            meta={
                <div className="space-y-1 text-left">
                    {eyebrow ? (
                        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {eyebrow}
                        </p>
                    ) : null}
                    <Link
                        href={href}
                        className="block min-w-0 rounded outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <h3 className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-foreground">
                            {title}
                        </h3>
                    </Link>
                    {description ? (
                        <p className="line-clamp-3 text-xs leading-4 text-muted-foreground">
                            {description}
                        </p>
                    ) : null}
                </div>
            }
        />
    );
}
