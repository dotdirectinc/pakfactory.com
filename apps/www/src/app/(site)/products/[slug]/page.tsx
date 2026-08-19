import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {ProductLineView} from '@/components/product/product-catalog-view';
import {ProductDetailView} from '@/components/product/product-detail-view';
import {getByProductsSegment, listLines, listProducts} from '@/lib/catalog/catalog';

type PageProps = {
    params: Promise<{slug: string}>;
};

export function generateStaticParams(): {slug: string}[] {
    const lines = listLines().map((line) => ({slug: line.slug}));
    const products = listProducts().map((product) => ({slug: product.slug}));
    return [...lines, ...products];
}

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
    const {slug} = await params;
    const result = getByProductsSegment(slug);
    if (!result) return {title: 'Products'};
    if (result.type === 'line') {
        return {title: result.line.title, description: result.line.description};
    }
    return {title: result.product.title, description: result.product.description};
}

export default async function ProductsSegmentPage({params}: PageProps) {
    const {slug} = await params;
    const result = getByProductsSegment(slug);
    if (!result) notFound();
    if (result.type === 'line') {
        return <ProductLineView line={result.line} />;
    }
    return <ProductDetailView product={result.product} />;
}
