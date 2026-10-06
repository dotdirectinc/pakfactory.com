import type {ComponentType} from 'react';

import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {ProductLineHero} from '@/components/product/product-line-hero';
import {ProductLineInspirationSection} from '@/components/product/product-line-inspiration-section';
import {
    SectionRenderer,
    type SectionComponentOverrides,
} from '@/components/sections/section-renderer';
import type {PageSection} from '@/components/sections/registry';
import {assembleProductLineLanding} from '@/lib/catalog/product-line-landing';
import type {Product, ProductLine} from '@/lib/catalog/types';
import {WWW_ROUTES} from '@/lib/www-routes';
import type {PageSectionInspirationIndustryDoc} from '@pakfactory/sanity/queries';

/**
 * Product-line landing page composition (PROD-1914).
 * Route-owned: breadcrumb + hero only. Body bands come from the merged
 * Product Line Page template × line sections (SectionRenderer), including
 * CMS `inspirationIndustry` via a host override.
 */
export function ProductLineLanding({line}: {line: ProductLine}) {
    const model = assembleProductLineLanding(line);
    const isBottomBar = model.heroLayout === 'bottomBar';
    const inspirationProducts = line.inspirationProducts ?? [];

    const breadcrumb = (
        <PageBreadcrumbSection
            band="muted"
            items={[
                {label: 'Home', href: WWW_ROUTES.home},
                {label: 'Products', href: WWW_ROUTES.products},
                {label: line.title},
            ]}
        />
    );

    const hero = (
        <ProductLineHero
            h1={model.h1}
            intro={model.intro}
            frames={model.frames}
            heroMode={model.heroMode}
            heroLayout={model.heroLayout}
            featuredImageUrl={model.featuredImageUrl}
            featuredImageAlt={model.featuredImageAlt}
            featuredVideoUrl={model.featuredVideoUrl}
            featuredIconUrl={model.featuredIconUrl}
            featuredIconAlt={model.featuredIconAlt}
            products={line.products}
            featuredProducts={line.featuredProducts}
            hasStyles={Boolean(model.styles)}
        />
    );

    const sectionComponents = inspirationIndustryHostComponents(
        line.title,
        inspirationProducts,
    );

    return (
        <>
            {isBottomBar ? (
                // Under sticky header (h-16): fill remaining viewport minus next-section peek
                // (120px mobile/tablet, 40px lg+).
                <div className="flex min-h-[calc(100svh-4rem-120px)] flex-col lg:min-h-[calc(100svh-4rem-40px)]">
                    {breadcrumb}
                    {hero}
                </div>
            ) : (
                <>
                    {breadcrumb}
                    {hero}
                </>
            )}

            {model.pageSections.length > 0 ? (
                <SectionRenderer
                    sections={model.pageSections}
                    components={sectionComponents}
                />
            ) : null}
        </>
    );
}

function inspirationIndustryHostComponents(
    lineTitle: string,
    products: Product[],
): SectionComponentOverrides {
    const InspirationIndustryFromHost: ComponentType<PageSection> = (
        section,
    ) => {
        if (products.length === 0) return null;
        const doc = section as PageSectionInspirationIndustryDoc;
        const curated = (doc.industries ?? [])
            .map((row) => {
                const slug = row?.slug?.trim();
                const title = row?.title?.trim();
                if (!slug || !title) return null;
                return {slug, title};
            })
            .filter((row): row is {slug: string; title: string} => row != null);

        return (
            <ProductLineInspirationSection
                lineTitle={lineTitle}
                products={products}
                eyebrow={doc.eyebrow?.trim() || undefined}
                heading={doc.heading?.trim() || undefined}
                description={doc.intro?.trim() || undefined}
                curatedIndustries={curated.length > 0 ? curated : null}
                borderTop={doc.showTopBorder === true}
                borderBottom={doc.showBottomBorder !== false}
            />
        );
    };

    return {inspirationIndustry: InspirationIndustryFromHost};
}
