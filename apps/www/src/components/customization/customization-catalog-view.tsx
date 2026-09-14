import {Suspense} from 'react';

import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {CustomizationCatalogPanel} from '@/components/customization/customization-catalog-panel';
import type {CustomizationLibraryResult} from '@/lib/catalog/types';
import {WWW_ROUTES} from '@/lib/www-routes';

export type {CustomizationCatalogTab} from '@/components/customization/customization-catalog-panel';

type CustomizationCatalogViewProps = {
    library: CustomizationLibraryResult;
    /** Sync filters to URL (route). Section embeds should set false. */
    urlSync?: boolean;
    initialCategory?: string | null;
    /** When false, omit breadcrumb + page heading (section embed). */
    showPageChrome?: boolean;
    heading?: string | null;
    intro?: string | null;
};

export function CustomizationCatalogView({
    library,
    urlSync = true,
    initialCategory = null,
    showPageChrome = true,
    heading,
    intro,
}: CustomizationCatalogViewProps) {
    const title = heading?.trim() || 'Customizations';
    const description =
        intro?.trim() ||
        "Discover our diverse customizations — PakFactory has a curated library of packaging solutions to elevate your brand's packaging experience.";

    return (
        <>
            {showPageChrome ? (
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
                    />
                </>
            ) : heading || intro ? (
                <div className="mx-auto w-full max-w-7xl px-4 pb-2 pt-8 sm:px-6 lg:px-8">
                    {heading ? (
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                            {heading}
                        </h2>
                    ) : null}
                    {intro ? (
                        <p className="mt-2 max-w-2xl text-muted-foreground">
                            {intro}
                        </p>
                    ) : null}
                </div>
            ) : null}
            <Suspense
                fallback={
                    <div className="mx-auto w-full max-w-7xl px-4 py-16 text-sm text-muted-foreground sm:px-6 lg:px-8">
                        Loading customizations…
                    </div>
                }
            >
                <CustomizationCatalogPanel
                    library={library}
                    urlSync={urlSync}
                    initialCategory={initialCategory}
                />
            </Suspense>
        </>
    );
}
