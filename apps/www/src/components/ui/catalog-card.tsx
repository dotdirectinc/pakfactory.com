import {
    MediaTileCard,
    type MediaTileCardProps,
} from '@/components/ui/media-tile-card';

const SEE_ALL = 'See all';

export type CatalogCardProps = Omit<MediaTileCardProps, 'ctaLabel'> & {
    /** CTA label; pass `null` to hide. Default `See all`. */
    ctaLabel?: string | null;
};

/**
 * **General card** — catalog navigation tile for lines, styles, formats, and similar entries.
 * Composes {@link MediaTileCard}; keep domain mapping at the call site.
 */
export function CatalogCard({
    ctaLabel = SEE_ALL,
    ...props
}: CatalogCardProps) {
    return <MediaTileCard ctaLabel={ctaLabel} {...props} />;
}
