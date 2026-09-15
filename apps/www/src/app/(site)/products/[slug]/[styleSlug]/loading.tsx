import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';

import {ProductCatalogGridSkeleton} from '@/components/product/product-card-skeleton';

export default function ProductStyleLoading() {
    return (
        <PageDielineSection innerClassName="pb-24 pt-8">
            <ProductCatalogGridSkeleton />
        </PageDielineSection>
    );
}
