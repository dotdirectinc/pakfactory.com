'use client';

import {
    PortableText,
    type PortableTextComponents,
} from '@portabletext/react';
import {
    PageDielineSection,
    type PageDielinePaddingBlock,
} from '@pakfactory/ui/components/page-dieline-section';
import {externalLinkAttributes} from '@pakfactory/utilities/external-link';
import {CustomizationConfigPanel} from '@/components/customization/customization-config-panel';
import {useCustomizationDetailHost} from '@/components/customization/customization-detail-host';
import {
    CUSTOMIZATION_GALLERY_WELL_PREFETCH_WIDTH,
    CUSTOMIZATION_GALLERY_WELL_SIZES,
    ProductGallery,
} from '@/components/product/product-gallery';
import {StatusBadge} from '@/components/ui/status-badge';
import {formatSectionEyebrow} from '@/components/ui/section-heading';

export const CUSTOMIZATION_OVERVIEW_STANDARD_ID =
    'customization-overview-standard';

const glossaryHeroComponents: PortableTextComponents = {
    block: {
        normal: ({children}) => (
            <p className="mb-3 text-base leading-relaxed text-muted-foreground last:mb-0">
                {children}
            </p>
        ),
    },
    marks: {
        strong: ({children}) => (
            <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({children}) => <em>{children}</em>,
        link: ({value, children}) => {
            const href: string = value?.href ?? '#';
            return (
                <a
                    href={href}
                    className="font-medium text-primary underline underline-offset-4 hover:no-underline"
                    {...externalLinkAttributes(href)}
                >
                    {children}
                </a>
            );
        },
    },
};

export type CustomizationOverviewChromeProps = {
    paddingBlock?: PageDielinePaddingBlock;
    borderTop?: boolean;
    borderBottom?: boolean;
};

/**
 * Standard CDP overview — gallery + Configuration rail (PROD-3112 section).
 */
export function CustomizationOverviewStandard({
    paddingBlock = 'md',
    borderTop = false,
    borderBottom = true,
}: CustomizationOverviewChromeProps = {}) {
    const {detail} = useCustomizationDetailHost();
    const typeEyebrow =
        detail.typeTitle?.trim() ||
        detail.categoryLabel ||
        detail.categoryValue;

    return (
        <PageDielineSection
            borderTop={borderTop}
            borderBottom={borderBottom}
            paddingBlock={paddingBlock}
        >
            <article
                id={CUSTOMIZATION_OVERVIEW_STANDARD_ID}
                className="scroll-mt-32 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
            >
                <ProductGallery
                    media={detail.media}
                    productTitle={detail.title}
                    featuredVideoUrl={detail.featuredVideoUrl}
                    wellSizes={CUSTOMIZATION_GALLERY_WELL_SIZES}
                    wellPrefetchWidth={CUSTOMIZATION_GALLERY_WELL_PREFETCH_WIDTH}
                />
                <div>
                    <div className="flex items-center justify-between gap-4">
                        <p className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-[0.08em] text-primary uppercase">
                            {formatSectionEyebrow(typeEyebrow)}
                        </p>
                        <StatusBadge
                            status={detail.status}
                            className="shrink-0"
                        />
                    </div>
                    <h1 className="mt-1 text-4xl font-semibold text-foreground">
                        {detail.title}
                    </h1>
                    {detail.glossaryDefinition?.length ? (
                        <div className="mt-4 text-base">
                            <PortableText
                                value={detail.glossaryDefinition}
                                components={glossaryHeroComponents}
                            />
                        </div>
                    ) : null}
                    <CustomizationConfigPanel />
                </div>
            </article>
        </PageDielineSection>
    );
}
