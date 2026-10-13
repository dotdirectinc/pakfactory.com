import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {ProductDetailView} from '@/components/product/product-detail-view';
import {ProductLineLanding} from '@/components/product/product-line-landing-view';
import {
    getByProductsSegment,
    listLineStyleParams,
    listProductRelatedIndex,
} from '@/lib/catalog/catalog';
import {staticParamsExceptPreview} from '@/lib/static-params';

export const revalidate = 60;

type PageProps = {
    params: Promise<{slug: string}>;
};

export async function generateStaticParams(): Promise<{slug: string}[]> {
    return staticParamsExceptPreview(async () => {
        // Slim reads: the full line and product lists are too big to cache (PROD-3004).
        const [lines, products] = await Promise.all([
            listLineStyleParams(),
            listProductRelatedIndex(),
        ]);
        return [
            ...lines.map((line) => ({slug: line.slug})),
            ...products.map((product) => ({slug: product.slug})),
        ];
    });
}

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
    const {slug} = await params;
    const result = await getByProductsSegment(slug);
    if (!result) return {title: 'Products'};
    if (result.type === 'line') {
        return {title: result.line.title, description: result.line.description};
    }
    return {title: result.product.title, description: result.product.description};
}

export default async function ProductsSegmentPage({params}: PageProps) {
    const {slug} = await params;
    const result = await getByProductsSegment(slug);
    if (!result) notFound();
    if (result.type === 'line') {
        return <ProductLineLanding line={result.line} />;
    }
    return <ProductDetailView product={result.product} />;
}
