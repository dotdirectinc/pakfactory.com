'use client';

import {cn} from '@pakfactory/ui/lib/utils';
import {MediaCaptionCard} from '@/components/ui/media-caption-card';
import {formatSectionEyebrow} from '@/components/ui/section-heading';
import {SanityImage} from '@/components/ui/sanity-image';
import {fillShowcaseBentoSlots} from '@/lib/catalog/showcase-bento';
import type {CustomizationShowcaseTile} from '@/lib/catalog/types';

type CustomizationShowcaseGalleryProps = {
    kicker: string;
    title: string;
    subtitle: string;
    solutions: CustomizationShowcaseTile[];
    caseStudies: CustomizationShowcaseTile[];
    className?: string;
};

/** Shared tile shell — fill grid cell; tall enough for hover detail card on mobile. */
const tileShellClass =
    'h-full min-h-80 overflow-hidden rounded-2xl ring-1 ring-border/40 lg:min-h-0';

function ShowcasePlainTile({
    tile,
    className,
}: {
    tile: CustomizationShowcaseTile;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'relative bg-muted',
                tileShellClass,
                className,
            )}
        >
            <SanityImage
                src={tile.src}
                alt={tile.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover"
            />
        </div>
    );
}

function ShowcaseLinkedTile({
    tile,
    className,
}: {
    tile: CustomizationShowcaseTile;
    className?: string;
}) {
    if (!tile.href || !tile.linkLabel) {
        return <ShowcasePlainTile tile={tile} className={className} />;
    }

    return (
        <MediaCaptionCard
            title={tile.title}
            description={tile.description}
            image={{src: tile.src, alt: tile.alt}}
            imageFit="cover"
            link={{label: tile.linkLabel, href: tile.href}}
            captionMode="hover"
            className={cn(
                'aspect-auto sm:aspect-auto',
                tileShellClass,
                className,
            )}
        />
    );
}

/**
 * Slot → grid placement (lg+).
 * Tile 3 is the large right feature (2 cols × 2 rows).
 */
const TILE_PLACEMENT = [
    'lg:col-start-2 lg:row-start-1', // mid-top
    'lg:col-start-3 lg:row-start-1', // top-right
    'lg:col-start-1 lg:row-start-2', // mid-left
    'lg:col-span-2 lg:col-start-2 lg:row-span-2 lg:row-start-2', // large right
    'lg:col-start-1 lg:row-start-3', // bottom-left
] as const;

/**
 * Annotated 3×3 bento: copy top-left; up to five image tiles; tile 3 spans
 * the mid/bottom right. Row tracks stay tall enough for the hover detail card.
 */
export function CustomizationShowcaseGallery({
    kicker,
    title,
    subtitle,
    solutions,
    caseStudies,
    className,
}: CustomizationShowcaseGalleryProps) {
    const tiles = fillShowcaseBentoSlots(solutions, caseStudies);

    return (
        <div
            className={cn(
                'flex flex-col gap-6',
                'lg:grid lg:min-h-[min(90vh,900px)] lg:grid-cols-3',
                'lg:grid-rows-[repeat(3,minmax(20rem,1fr))] lg:gap-6',
                className,
            )}
        >
            <header className="flex h-full flex-col justify-center gap-4 lg:col-start-1 lg:row-start-1">
                <p className="text-[11px] font-semibold tracking-[0.08em] text-brand-blue uppercase">
                    {formatSectionEyebrow(kicker)}
                </p>
                <h2 className="text-base font-semibold text-foreground sm:text-lg md:text-[32px] md:leading-tight md:tracking-[-0.02em]">
                    {title}
                </h2>
                <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
                    {subtitle}
                </p>
            </header>

            {tiles.map((tile, index) => (
                <ShowcaseLinkedTile
                    key={`${tile.href ?? tile.src}-${index}`}
                    tile={tile}
                    className={TILE_PLACEMENT[index]}
                />
            ))}
        </div>
    );
}
