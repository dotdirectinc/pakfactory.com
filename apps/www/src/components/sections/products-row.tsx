import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {
    ProductCard,
    type ProductCardData,
} from '@/components/product/product-card';

type ProductsRowProps = {
    heading?: string;
    description?: string;
    products: ProductCardData[];
    className?: string;
};

/**
 * Catalogue strip of product cards — maps to Studio `productsRow` later.
 */
export function ProductsRow({
    heading = 'You might also like',
    description,
    products,
    className,
}: ProductsRowProps) {
    if (products.length === 0) return null;

    return (
        <section id="pdp-related" className={cn('scroll-mt-20', className)}>
            <PageDielineSection innerClassName="border-b border-dashed border-border py-16 sm:py-20">
                <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-semibold text-brand-blue sm:text-3xl">
                        {heading}
                    </h2>
                    {description ? (
                        <p className="mt-2 max-w-xl text-base leading-relaxed text-muted-foreground">
                            {description}
                        </p>
                    ) : null}
                </div>

                <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {products.map((product) => (
                        <li key={product.href}>
                            <ProductCard data={product} />
                        </li>
                    ))}
                </ul>
            </PageDielineSection>
        </section>
    );
}
