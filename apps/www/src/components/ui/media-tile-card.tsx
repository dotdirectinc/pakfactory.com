import Link from 'next/link';
import {ChevronRight, Package} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';
import {MediaSettleZoom} from '@/components/ui/media-settle-zoom';
import {SanityImage} from '@/components/ui/sanity-image';

export type MediaTileCardProps = {
    href: string;
    title: string;
    description?: string;
    ctaLabel?: string;
    imageSrc?: string | null;
    imageAlt?: string;
    className?: string;
};

/**
 * Generic media tile — full-width image, then centered title / description / CTA.
 * Structure follows Figma ProjectCardOrbit; colors/spacing use PakFactory tokens.
 */
export function MediaTileCard({
    href,
    title,
    description,
    ctaLabel = 'See all',
    imageSrc,
    imageAlt,
    className,
}: MediaTileCardProps) {
    return (
        <Link
            href={href}
            className={cn(
                'group flex flex-col overflow-hidden rounded-2xl bg-background outline-none',
                'ring-offset-background focus-visible:ring-2 focus-visible:ring-ring',
                className,
            )}
        >
            <div
                className={cn(
                    'relative aspect-square w-full overflow-hidden',
                    !imageSrc && 'bg-muted/40',
                )}
            >
                <MediaSettleZoom>
                    {imageSrc ? (
                        <SanityImage
                            src={imageSrc}
                            alt={imageAlt ?? title}
                            square
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
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
                </MediaSettleZoom>
            </div>

            <div className="flex w-full flex-col items-center gap-4 px-8 pb-8 pt-4">
                <p className="w-full text-center text-xl font-medium leading-snug tracking-tight text-foreground">
                    {title}
                </p>

                {description ? (
                    <p className="line-clamp-3 w-full text-center text-sm leading-5 text-muted-foreground">
                        {description}
                    </p>
                ) : null}

                <span className="inline-flex items-center justify-center gap-0.5 text-base font-semibold text-primary">
                    {ctaLabel}
                    <Icon
                        icon={ChevronRight}
                        size="sm"
                        className="transition-transform group-hover:translate-x-0.5"
                    />
                </span>
            </div>
        </Link>
    );
}
