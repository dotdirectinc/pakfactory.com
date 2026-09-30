import {
    CatalogCardGrid,
    type CatalogCardGridCard,
} from '@/components/ui/catalog-card-grid';

const STYLES_HEADING_ID = 'product-styles-heading';

export type ProductStylesCard = CatalogCardGridCard;

type ProductStylesSectionProps = {
    eyebrow?: string;
    headline: string;
    description?: string;
    cta?: {label: string; href: string};
    cards: ProductStylesCard[];
    className?: string;
    /** Section landmark id. Default `styles` (hero Explore styles anchor). */
    id?: string;
};

/**
 * Product-line Styles band — the shared `CatalogCardGrid` with the Styles
 * anchor ids (`#styles`, `product-styles-heading`). Parent owns hrefs.
 */
export function ProductStylesSection({
    id = 'styles',
    ...props
}: ProductStylesSectionProps) {
    return (
        <CatalogCardGrid id={id} headingId={STYLES_HEADING_ID} {...props} />
    );
}
