import {
    CustomizationCard,
    type CustomizationCardData,
} from '@/components/customization/customization-card';
import {MediaCardSkeleton} from '@/components/ui/media-card-skeleton';

const CATALOG_GRID_CLASS =
    'grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

type CustomizationCatalogListProps = {
    items: CustomizationCardData[];
    emptyMessage?: string;
};

export function CustomizationCatalogList({
    items,
    emptyMessage = 'No customizations match these filters. Reset or broaden search.',
}: CustomizationCatalogListProps) {
    if (items.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className={CATALOG_GRID_CLASS}>
            {items.map((item) => (
                <div key={item._id} className="min-h-0 h-full">
                    <CustomizationCard item={item} />
                </div>
            ))}
        </div>
    );
}

type CustomizationCatalogListSkeletonProps = {
    count?: number;
};

export function CustomizationCatalogListSkeleton({
    count = 12,
}: CustomizationCatalogListSkeletonProps) {
    return (
        <div
            className={CATALOG_GRID_CLASS}
            aria-busy="true"
            aria-live="polite"
        >
            <span className="sr-only">Loading customizations</span>
            {Array.from({length: count}, (_, index) => (
                <div key={index} className="min-h-0 h-full">
                    <MediaCardSkeleton className="h-full" />
                </div>
            ))}
        </div>
    );
}
