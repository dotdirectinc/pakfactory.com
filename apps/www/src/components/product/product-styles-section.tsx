'use client';

import {useState} from 'react';
import {Button} from '@pakfactory/ui/components/button';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {CatalogCard} from '@/components/ui/catalog-card';
import {SectionHeading} from '@/components/ui/section-heading';
import {sectionThemeShell} from '@/lib/ui/section-theme';

const STYLES_HEADING_ID = 'product-styles-heading';
const MAX_VISIBLE = 6;

export type ProductStylesCard = {
    id: string;
    title: string;
    href: string;
    description?: string;
    imageSrc?: string | null;
    imageAlt?: string;
};

type ProductStylesSectionProps = {
    eyebrow?: string;
    headline: string;
    description?: string;
    cta?: {label: string; href: string};
    cards: ProductStylesCard[];
    className?: string;
    /** Section landmark id. Default `styles` (hero Explore styles anchor). */
    id?: string;
};

/**
 * Product-line Styles band — SectionHeading + CatalogCard grid.
 * Shows up to 6 cards; See more expands the rest in place. Parent owns hrefs.
 */
export function ProductStylesSection({
    eyebrow,
    headline,
    description,
    cta,
    cards,
    className,
    id = 'styles',
}: ProductStylesSectionProps) {
    const [expanded, setExpanded] = useState(false);

    if (cards.length === 0) return null;

    const shell = sectionThemeShell('default');
    const canExpand = cards.length > MAX_VISIBLE;
    const visibleCards =
        expanded || !canExpand ? cards : cards.slice(0, MAX_VISIBLE);
    const showSeeMore = canExpand && !expanded;

    return (
        <section
            id={id}
            aria-labelledby={STYLES_HEADING_ID}
            data-section-theme={shell['data-section-theme']}
            className={cn('scroll-mt-32', shell.bandClass, className)}
        >
            <PageDielineSection
                as="div"
                borderBottom
                innerClassName="py-16 sm:py-24"
            >
                <SectionHeading
                    eyebrow={eyebrow}
                    title={
                        <span id={STYLES_HEADING_ID}>{headline}</span>
                    }
                    description={description}
                    descriptionClassName="text-base leading-6"
                    cta={cta}
                    ctaPlacement="end"
                />
                <ul className="mt-12 grid list-none grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                    {visibleCards.map((card) => (
                        <li key={card.id}>
                            <CatalogCard
                                href={card.href}
                                title={card.title}
                                description={card.description}
                                imageSrc={card.imageSrc}
                                imageAlt={card.imageAlt}
                                surface={shell.cardSurface}
                                emptyMedia="mark"
                            />
                        </li>
                    ))}
                </ul>
                {showSeeMore ? (
                    <div className="mt-8 flex justify-center">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setExpanded(true)}
                        >
                            See more
                        </Button>
                    </div>
                ) : null}
            </PageDielineSection>
        </section>
    );
}
