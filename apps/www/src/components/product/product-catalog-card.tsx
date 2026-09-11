import {
    MediaTileCard,
    type MediaTileCardProps,
} from '@/components/ui/media-tile-card';

const SEE_ALL = 'See all';

export type ProductCatalogCardProps = Omit<MediaTileCardProps, 'ctaLabel'> & {
    ctaLabel?: string;
};

/**
 * Catalog navigation card for product lines and styles.
 * Composes {@link MediaTileCard}; keep domain mapping at the call site.
 */
export function ProductCatalogCard({
    ctaLabel = SEE_ALL,
    ...props
}: ProductCatalogCardProps) {
    return <MediaTileCard ctaLabel={ctaLabel} {...props} />;
}
