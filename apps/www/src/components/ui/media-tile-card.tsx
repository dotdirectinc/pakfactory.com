import Link from 'next/link';
import {ChevronRight, Package} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';
import {PakFactoryMarkIcon} from '@pakfactory/ui/icons/pakfactory-mark-icon';

import {Icon} from '@/components/ui/icon';
import {SanityImage} from '@/components/ui/sanity-image';
import {
    productMediaRestClass,
    productMediaSelfHoverClass,
} from '@/lib/ui/product-media-scale';

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
 * **General card** core — discovery / navigation tile.
 * Full-width media, then centered title / description / CTA (“See all”).
 * Whole-card settle scale (`PRODUCT_MEDIA_SCALE`); brand mark on media hover.
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
                'hover:bg-muted focus-within:bg-muted',
                productMediaRestClass,
                productMediaSelfHoverClass,
                className,
            )}
        >
            <div
                className={cn(
                    'relative aspect-square w-full overflow-hidden',
                    !imageSrc && 'bg-muted',
                )}
            >
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
                {/* Detail affordance: brand mark on hover/focus */}
                <div
                    aria-hidden
                    className={cn(
                        'pointer-events-none absolute z-30 hidden text-black/5 sm:block',
                        'sm:right-3 sm:top-3',
                        'sm:translate-x-[-5px] sm:translate-y-[5px] sm:opacity-0',
                        'sm:transition-[opacity,translate] sm:duration-[var(--motion-slow)] sm:ease-in-out',
                        'sm:group-hover:translate-x-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100',
                        'sm:group-focus-within:translate-x-0 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100',
                        'motion-reduce:sm:translate-x-0 motion-reduce:sm:translate-y-0 motion-reduce:sm:opacity-100 motion-reduce:sm:transition-none',
                    )}
                >
                    <PakFactoryMarkIcon size={28} className="-rotate-15" />
                </div>
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
                    <Icon icon={ChevronRight} size="sm" />
                </span>
            </div>
        </Link>
    );
}
