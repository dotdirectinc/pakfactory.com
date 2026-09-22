import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {CatalogCard} from '@/components/ui/catalog-card';
import {SectionHeading} from '@/components/ui/section-heading';
import type {SolutionInspirationsContent} from '@/lib/solutions/types';
import {sectionThemeShell} from '@/lib/ui/section-theme';

const INSPIRATIONS_HEADING_ID = 'solution-inspirations-heading';

type SolutionInspirationsProps = {
    content: SolutionInspirationsContent;
    className?: string;
};

/**
 * Industry Solution LP inspirations band — SectionHeading + CatalogCard grid.
 * Props-only; maps fixture/CMS content onto shared UI (ADR-013).
 */
export function SolutionInspirations({
    content,
    className,
}: SolutionInspirationsProps) {
    const {eyebrow, headline, description, cta, cards} = content;
    if (cards.length === 0) return null;

    const shell = sectionThemeShell('muted');

    return (
        <section
            id="inspirations"
            aria-labelledby={INSPIRATIONS_HEADING_ID}
            data-section-theme={shell['data-section-theme']}
            className={cn('scroll-mt-32', shell.bandClass, className)}
        >
            <PageDielineSection
                as="div"
                innerClassName="border-b border-dashed border-border py-16 sm:py-24"
            >
                <SectionHeading
                    eyebrow={eyebrow}
                    title={
                        <span id={INSPIRATIONS_HEADING_ID}>{headline}</span>
                    }
                    description={description}
                    descriptionClassName="text-base leading-6"
                    cta={cta}
                    ctaPlacement="end"
                    className="mb-16"
                />
                <ul className="grid list-none grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {cards.map((card) => (
                        <li key={card.id}>
                            <CatalogCard
                                href={card.href}
                                title={card.title}
                                description={card.description}
                                imageSrc={card.image.src}
                                imageAlt={card.image.alt}
                                surface={shell.cardSurface}
                            />
                        </li>
                    ))}
                </ul>
            </PageDielineSection>
        </section>
    );
}
