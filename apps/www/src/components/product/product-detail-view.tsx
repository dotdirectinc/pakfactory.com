import {Badge} from '@pakfactory/ui/components/badge';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {ProductGallery} from '@/components/product/product-gallery';
import {ProductRequestRail} from '@/components/product/product-request-rail';
import type {Product} from '@/lib/catalog/types';

type ProductDetailViewProps = {
    product: Product;
};

export function ProductDetailView({product}: ProductDetailViewProps) {
    return (
        <PageDielineSection innerClassName="border-b border-dashed border-border">
            <article className="grid gap-10 py-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <ProductGallery media={product.media} productTitle={product.title} />
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                            {product.sku}
                        </p>
                        {product.kind === 'inspiration' ? (
                            <Badge variant="secondary">Inspiration</Badge>
                        ) : null}
                    </div>
                    <h1 className="mt-1 text-4xl font-semibold text-brand-blue">
                        {product.title}
                    </h1>
                    <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                        {product.description}
                    </p>
                    {product.productStyle ? (
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                            <span className="font-semibold text-brand-blue">Style: </span>
                            {product.productStyle.title}
                        </p>
                    ) : null}
                    <ProductRequestRail product={product} />
                </div>
            </article>
        </PageDielineSection>
    );
}
