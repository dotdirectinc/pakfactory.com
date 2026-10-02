import {
    CustomizationCatalogPageChrome,
} from '@/components/customization/customization-catalog-page-loading';
import {CustomizationCatalogPanel} from '@/components/customization/customization-catalog-panel';
import {packCustomizationLibrary} from '@/lib/catalog/library-wire';
import type {CustomizationLibraryResult} from '@/lib/catalog/types';

export type {CustomizationCatalogTab} from '@/components/customization/customization-catalog-panel';

type CustomizationCatalogViewProps = {
    library: CustomizationLibraryResult;
    /** Sync filters to URL (route). Section embeds should set false. */
    urlSync?: boolean;
    initialCategory?: string | null;
    /** When false, omit breadcrumb + page heading (section embed / page-owned chrome). */
    showPageChrome?: boolean;
    /** Drop the desktop sticky strip top border (embed under a headed section). */
    hideCatalogBorderTop?: boolean;
    heading?: string | null;
    intro?: string | null;
};

export function CustomizationCatalogView({
    library,
    urlSync = true,
    initialCategory = null,
    showPageChrome = true,
    hideCatalogBorderTop = false,
    heading,
    intro,
}: CustomizationCatalogViewProps) {
    return (
        <>
            {showPageChrome ? (
                <CustomizationCatalogPageChrome heading={heading} intro={intro} />
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
            <CustomizationCatalogPanel
                packedLibrary={packCustomizationLibrary(library)}
                urlSync={urlSync}
                initialCategory={initialCategory}
                hideCatalogBorderTop={hideCatalogBorderTop}
            />
        </>
    );
}
