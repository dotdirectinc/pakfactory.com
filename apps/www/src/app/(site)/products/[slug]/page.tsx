import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {ProductLineView} from '@/components/product/product-catalog-view';
import {ProductDetailView} from '@/components/product/product-detail-view';
import {getByProductsSegment, listLines, listProducts} from '@/lib/catalog/catalog';

type PageProps = {
    params: Promise<{slug: string}>;
};

export async function generateStaticParams(): Promise<{slug: string}[]> {
    const [lines, products] = await Promise.all([listLines(), listProducts()]);
    return [
        ...lines.map((line) => ({slug: line.slug})),
        ...products.map((product) => ({slug: product.slug})),
    ];
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
        return <ProductLineView line={result.line} />;
    }
    return <ProductDetailView product={result.product} />;
}
