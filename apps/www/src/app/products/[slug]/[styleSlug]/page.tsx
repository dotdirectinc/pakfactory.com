import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {ProductStyleView} from '@/components/product/product-catalog-view';
import {getStyle, listLines} from '@/lib/catalog/catalog';

type PageProps = {
    params: Promise<{slug: string; styleSlug: string}>;
};

export function generateStaticParams(): {slug: string; styleSlug: string}[] {
    return listLines().flatMap((line) =>
        line.styles.map((style) => ({slug: line.slug, styleSlug: style.slug})),
    );
}

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
    const {slug, styleSlug} = await params;
    const match = getStyle(slug, styleSlug);
    if (!match) return {title: 'Product style'};
    return {
        title: `${match.style.title} · ${match.line.title}`,
        description: `${match.style.title} packaging in ${match.line.title}.`,
    };
}

export default async function ProductStylePage({params}: PageProps) {
    const {slug, styleSlug} = await params;
    const match = getStyle(slug, styleSlug);
    if (!match) notFound();
    return <ProductStyleView line={match.line} style={match.style} />;
}
