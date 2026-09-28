import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {ProductLineHero} from '@/components/product/product-line-hero';
import {SectionRenderer} from '@/components/sections/section-renderer';
import {assembleProductLineLanding} from '@/lib/catalog/product-line-landing';
import type {ProductLine} from '@/lib/catalog/types';
import {WWW_ROUTES} from '@/lib/www-routes';

/**
 * Product-line landing page composition (PROD-1914).
 * Route-owned: breadcrumb + hero only. All body bands come from the merged
 * Product Line Page template × line sections (SectionRenderer).
 */
export function ProductLineLanding({line}: {line: ProductLine}) {
    const model = assembleProductLineLanding(line);
    const isBottomBar = model.heroLayout === 'bottomBar';

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
            hasStyles={Boolean(model.styles)}
        />
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
                <SectionRenderer sections={model.pageSections} />
            ) : null}
        </>
    );
}
