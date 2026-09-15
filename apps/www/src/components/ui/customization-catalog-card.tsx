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
};

/**
 * PDP Materials & finishes browse tile — transactional MediaCardFrame (like ProductCard)
 * without bookmark/compare; media hover opens quick view via onCloserLook.
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
}: CustomizationCatalogCardProps) {
    const placeholder = (
        <span className="flex size-full items-center justify-center">
            <Icon
                icon={Package}
                className="size-8 text-muted-foreground/50"
            />
        </span>
    );

    const media = (
        <div className="absolute inset-0">
            <div className="pointer-events-none absolute inset-0 z-0">
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
                    placeholder
                )}
            </div>
            <div
                className={cn(
                    'absolute inset-0 z-10 flex items-center justify-center p-3',
                    'opacity-0 transition-opacity duration-200',
                    'group-hover:opacity-100 group-focus-within:opacity-100',
                    'motion-reduce:transition-none',
                )}
            >
                <div
                    aria-hidden
                    className="absolute inset-0 bg-black/28"
                />
                <Button
                    type="button"
                    variant="ghost"
                    tabIndex={0}
                    aria-label={`Take a closer look at ${title}`}
                    className={cn(
                        'relative z-1 h-auto w-full max-w-50 cursor-pointer justify-center',
                        'rounded-2xl bg-foreground px-4 py-2 text-xs font-medium text-background',
                        'shadow-none hover:bg-foreground/90 hover:text-background sm:text-sm',
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
        </div>
    );

    return (
        <MediaCardFrame
            className={cn('h-full', className)}
            media={media}
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
