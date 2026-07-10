import type {Metadata} from 'next';
import CategoryFilter from '@/components/modules/category-filter';
import ProductGrid from '@/components/modules/product-grid';
import SectionHeader from '@/components/modules/section-header';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Products',
    description: 'Browse programs and collections.',
};

export default async function ProductsIndexPage() {
    return (
        <>
            <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
                <SectionHeader
                    title="Products"
                    description="Custom packaging solutions tailored to your brand."
                />
            </div>
            <CategoryFilter>
                <ProductGrid />
            </CategoryFilter>
        </>
    );
}
