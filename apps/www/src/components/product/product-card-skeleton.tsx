import {MediaCardSkeleton} from '@/components/ui/media-card-skeleton';

/** Alias of the shared media-card placeholder for product grids. */
export function ProductCardSkeleton() {
    return <MediaCardSkeleton className="h-full" />;
}

const PRODUCT_GRID_CLASS =
    'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-8';

type ProductCatalogGridSkeletonProps = {
    count?: number;
};

export function ProductCatalogGridSkeleton({
    count = 8,
}: ProductCatalogGridSkeletonProps) {
    return (
        <div
            className={PRODUCT_GRID_CLASS}
            aria-busy="true"
            aria-live="polite"
        >
            <span className="sr-only">Loading products</span>
            {Array.from({length: count}, (_, index) => (
                <div key={index} className="min-h-0 h-full">
                    <ProductCardSkeleton />
                </div>
            ))}
        </div>
    );
}
