import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';

import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {CustomizationCatalogFiltersSkeleton} from '@/components/customization/customization-catalog-filters';
import {CustomizationCatalogListSkeleton} from '@/components/customization/customization-catalog-list';
import {WWW_ROUTES} from '@/lib/www-routes';

const CUSTOMIZATIONS_HEADING = 'Customizations';
const CUSTOMIZATIONS_INTRO =
    "Discover our diverse customizations — PakFactory has a curated library of packaging solutions to elevate your brand's packaging experience.";

/**
 * Fixed breadcrumb + heading for `/customizations` — shared by the page and
 * `loading.tsx` so the title does not jump when the grid resolves.
 */
export function CustomizationCatalogPageChrome({
    heading,
    intro,
}: {
    heading?: string | null;
    intro?: string | null;
} = {}) {
    const title = heading?.trim() || CUSTOMIZATIONS_HEADING;
    const description = intro?.trim() || CUSTOMIZATIONS_INTRO;

    return (
        <>
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Customizations'},
                ]}
            />
            <PageHeadingSection
                title={title}
                description={description}
                borderBottom={false}
            />
        </>
    );
}

/** Facet rail + card grid — used by route `loading.tsx` and in-view Suspense. */
export function CustomizationCatalogPanelLoading({
    categoryGroupCount = 0,
}: {
    categoryGroupCount?: number;
} = {}) {
    return (
        <PageDielineSection
            paddingBlock="none"
            innerClassName="flex flex-col gap-8 pb-24 pt-8"
        >
            <div
                className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8"
                aria-busy="true"
                aria-live="polite"
            >
                <span className="sr-only">Loading customizations catalog</span>
                <CustomizationCatalogFiltersSkeleton
                    categoryGroupCount={categoryGroupCount}
                />
                <div className="min-w-0 flex-1">
                    <CustomizationCatalogListSkeleton />
                </div>
            </div>
        </PageDielineSection>
    );
}

/**
 * Full `/customizations` route shell — real chrome + facet rail + card grid.
 * In-view Suspense under live chrome should use {@link CustomizationCatalogPanelLoading}.
 */
export function CustomizationCatalogPageLoading({
    categoryGroupCount = 0,
}: {
    categoryGroupCount?: number;
} = {}) {
    return (
        <>
            <CustomizationCatalogPageChrome />
            <CustomizationCatalogPanelLoading
                categoryGroupCount={categoryGroupCount}
            />
        </>
    );
}
