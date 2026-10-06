'use client';

import {useState} from 'react';
import {ChevronDown} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {CatalogCard} from '@/components/ui/catalog-card';
import {SectionHeading} from '@/components/ui/section-heading';
import {sectionThemeShell} from '@/lib/ui/section-theme';

const MAX_VISIBLE = 6;

export type CatalogCardGridCard = {
    id: string;
    title: string;
    href: string;
    description?: string;
    imageSrc?: string | null;
    imageAlt?: string;
};

export type CatalogCardGridProps = {
    /** Section landmark id. */
    id: string;
    /** H2 id for `aria-labelledby`. Defaults to `${id}-heading`. */
    headingId?: string;
    eyebrow?: string;
    headline: string;
    description?: string;
    cta?: {label: string; href: string};
    cards: CatalogCardGridCard[];
    align?: 'left' | 'center';
    borderTop?: boolean;
    borderBottom?: boolean;
    className?: string;
};

/**
 * Catalog band — SectionHeading + a grid of general `CatalogCard`s (DESIGN.md
 * § Cards). Shows up to 6; See more expands the rest in place. Props-only
 * shared core (ADR-013): Product-line Styles, Product line row and Solution
 * row all render through it. Parent owns hrefs.
 */
export function CatalogCardGrid({
    id,
    headingId = `${id}-heading`,
    eyebrow,
    headline,
    description,
    cta,
    cards,
    align = 'left',
    borderTop = false,
    borderBottom = true,
    className,
}: CatalogCardGridProps) {
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
            aria-labelledby={headingId}
            data-section-theme={shell['data-section-theme']}
            className={cn('scroll-mt-32', shell.bandClass, className)}
        >
            <PageDielineSection
                as="div"
                borderTop={borderTop}
                borderBottom={borderBottom}
                innerClassName="py-16 sm:py-24"
            >
                <SectionHeading
                    eyebrow={eyebrow}
                    title={<span id={headingId}>{headline}</span>}
                    description={description}
                    cta={cta}
                    align={align}
                    ctaPlacement="end"
                />
                <ul className="mt-12 grid list-none grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleCards.map((card) => (
                        <li key={card.id}>
                            <CatalogCard
                                href={card.href}
                                title={card.title}
                                description={card.description}
                                imageSrc={card.imageSrc}
                                imageAlt={card.imageAlt}
                                surface="elevated"
                                emptyMedia="mark"
                            />
                        </li>
                    ))}
                </ul>
                {showSeeMore ? (
                    <div className="mt-8 flex justify-center">
                        <Button
                            type="button"
                            variant="link"
                            onClick={() => setExpanded(true)}
                            className="gap-1 font-semibold text-primary"
                        >
                            See more
                            <ChevronDown className="size-4" aria-hidden />
                        </Button>
                    </div>
                ) : null}
            </PageDielineSection>
        </section>
    );
}
