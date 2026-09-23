import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {CatalogCard} from '@/components/ui/catalog-card';
import {SectionHeading} from '@/components/ui/section-heading';
import type {InspirationGalleryContent} from '@/lib/solutions/types';
import {sectionThemeShell} from '@/lib/ui/section-theme';

const INSPIRATIONS_HEADING_ID = 'inspiration-gallery-heading';

type InspirationGalleryProps = {
    content: InspirationGalleryContent;
    className?: string;
    /** Section landmark id. Default `inspirations`. */
    id?: string;
};

/**
 * Inspiration Gallery — SectionHeading + CatalogCard grid (ADR-020).
 * Props-only; CMS path via `inspirationsGrid` (WP3).
 */
export function InspirationGallery({
    content,
    className,
    id = 'inspirations',
}: InspirationGalleryProps) {
    const {
        eyebrow,
        headline,
        description,
        cta,
        cards,
        align = 'left',
        borderTop = false,
        borderBottom = true,
    } = content;
    if (cards.length === 0) return null;

    const shell = sectionThemeShell('muted');

    return (
        <section
            id={id}
            aria-labelledby={INSPIRATIONS_HEADING_ID}
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
                    title={
                        <span id={INSPIRATIONS_HEADING_ID}>{headline}</span>
                    }
                    description={description}
                    descriptionClassName="text-base leading-6"
                    align={align}
                    cta={cta}
                    ctaPlacement="end"
                />
                <ul className="mt-12 grid list-none grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                    {cards.map((card) => (
                        <li key={card.id}>
                            <CatalogCard
                                href={card.href}
                                title={card.title}
                                description={card.description}
                                imageSrc={card.image.src}
                                imageAlt={card.image.alt}
                            />
                        </li>
                    ))}
                </ul>
            </PageDielineSection>
        </section>
    );
}
