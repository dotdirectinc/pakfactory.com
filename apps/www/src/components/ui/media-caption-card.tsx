import {PakFactoryMarkIcon} from '@pakfactory/ui/icons/pakfactory-mark-icon';
import {cn} from '@pakfactory/ui/lib/utils';

import {
    HeroMediaCaption,
    type HeroMediaCaptionProps,
} from '@/components/ui/hero-media-caption';
import {MediaSettleZoom} from '@/components/ui/media-settle-zoom';
import {SanityImage} from '@/components/ui/sanity-image';

export type MediaCaptionCardImage = {src: string; alt: string};

export type MediaCaptionCardProps = {
    kindLabel: string;
    title: string;
    description?: string;
    image?: MediaCaptionCardImage;
    /** Product cut-outs sit contained; photos cover. Default `cover`. */
    imageFit?: 'contain' | 'cover';
    link?: HeroMediaCaptionProps['link'];
    stat?: HeroMediaCaptionProps['stat'];
    className?: string;
};

/**
 * Props-only media well + white caption panel for SectionCarousel / Finder
 * (PROD-2666). Kind-agnostic — product line, industry, case study, promo.
 */
export function MediaCaptionCard({
    kindLabel,
    title,
    description,
    image,
    imageFit = 'cover',
    link,
    stat,
    className,
}: MediaCaptionCardProps) {
    const contain = imageFit === 'contain';
    return (
        <div
            className={cn(
                'group relative aspect-4/5 overflow-hidden rounded-xl bg-muted sm:aspect-[5/4]',
                className,
            )}
        >
            {image ? (
                <MediaSettleZoom className="absolute inset-0">
                    <SanityImage
                        src={image.src}
                        alt={image.alt}
                        fill
                        sizes="(max-width: 768px) 85vw, 40vw"
                        className={cn(
                            contain ? 'object-contain p-8 sm:p-12' : 'object-cover',
                        )}
                    />
                </MediaSettleZoom>
            ) : (
                <span className="flex size-full items-center justify-center pb-40 text-muted-foreground/40">
                    <PakFactoryMarkIcon size={48} className="-rotate-15" />
                </span>
            )}
            <HeroMediaCaption
                kindLabel={kindLabel}
                title={title}
                description={description}
                link={link}
                stat={stat}
                className="absolute inset-x-4 bottom-4 sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-80"
            />
        </div>
    );
}
