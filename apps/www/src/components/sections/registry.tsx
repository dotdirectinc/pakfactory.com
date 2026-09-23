import type {ComponentType} from 'react';
import type {
    PageSectionCaseStudiesRowDoc,
    PageSectionDoc,
    PageSectionExpertiseSequenceDoc,
    PageSectionFaqSectionDoc,
    PageSectionInspirationsGridDoc,
    PageSectionLogoWallDoc,
    PageSectionMediaFeatureDoc,
    PageSectionTestimonialsRowDoc,
    PageSectionVideoCaseStudiesRowDoc,
} from '@pakfactory/sanity/queries';

import {CaseStudiesRow} from '@/components/sections/case-studies-row';
import {ExpertiseRow} from '@/components/sections/expertise-row';
import {FaqSection} from '@/components/sections/faq-section';
import {InspirationGallery} from '@/components/sections/inspiration-gallery';
import {LogoWall} from '@/components/sections/logo-wall';
import {TestimonialsRow} from '@/components/sections/testimonials-row';
import {VideoCaseStudiesRow} from '@/components/sections/video-case-studies-row';
import {TextWithImage} from '@/components/ui/text-with-image';
import {mapCaseStudiesRow} from '@/lib/sections/map-case-studies-row';
import {mapExpertiseSequence} from '@/lib/sections/map-expertise-sequence';
import {mapFaqSection} from '@/lib/sections/map-faq-section';
import {mapInspirationsGrid} from '@/lib/sections/map-inspirations-grid';
import {mapLogoWall} from '@/lib/sections/map-logo-wall';
import {mapMediaFeature} from '@/lib/sections/map-media-feature';
import {mapTestimonialsRow} from '@/lib/sections/map-testimonials-row';
import {mapVideoCaseStudiesRow} from '@/lib/sections/map-video-case-studies-row';

/**
 * www page-sections registry — maps Sanity `_type` → React (ADR-015).
 * Page-agnostic: solutions, home, product, etc. all share this map.
 * Blog keeps BlockRenderer (blocks / pageBuilder).
 */

export type PageSection = PageSectionDoc;

function FaqSectionFromSanity(section: PageSectionFaqSectionDoc) {
    const mapped = mapFaqSection(section);
    if (mapped.items.length === 0) return null;
    return (
        <FaqSection
            sectionId={`section-faqs-${section._key}`}
            items={mapped.items}
            heading={mapped.heading}
            description={mapped.intro}
            eyebrow={mapped.eyebrow}
            align={mapped.align}
            borderTop={mapped.borderTop}
            borderBottom={mapped.borderBottom}
            cta={mapped.cta}
        />
    );
}

function LogoWallFromSanity(section: PageSectionLogoWallDoc) {
    const mapped = mapLogoWall(section);
    if (mapped.items.length === 0) return null;
    return (
        <LogoWall
            content={mapped}
            headingId={`logo-wall-${section._key}`}
        />
    );
}

function MediaFeatureFromSanity(section: PageSectionMediaFeatureDoc) {
    const mapped = mapMediaFeature(section);
    if (!mapped) return null;
    return (
        <TextWithImage
            id={`media-feature-${section._key}`}
            eyebrow={mapped.eyebrow}
            title={mapped.title}
            body={mapped.body}
            cta={mapped.cta}
            image={mapped.image}
            align={mapped.align}
            borderTop={mapped.borderTop}
            borderBottom={mapped.borderBottom}
        />
    );
}

function ExpertiseSequenceFromSanity(
    section: PageSectionExpertiseSequenceDoc,
) {
    const mapped = mapExpertiseSequence(section);
    if (mapped.stages.length === 0) return null;
    return (
        <ExpertiseRow
            content={mapped}
            id={`expertise-${section._key}`}
        />
    );
}

function CaseStudiesRowFromSanity(section: PageSectionCaseStudiesRowDoc) {
    const mapped = mapCaseStudiesRow(section);
    if (mapped.cards.length === 0) return null;
    return (
        <CaseStudiesRow
            content={mapped}
            id={`case-studies-${section._key}`}
        />
    );
}

function InspirationsGridFromSanity(section: PageSectionInspirationsGridDoc) {
    const mapped = mapInspirationsGrid(section);
    if (mapped.cards.length === 0) return null;
    return (
        <InspirationGallery
            content={mapped}
            id={`inspirations-${section._key}`}
        />
    );
}

function VideoCaseStudiesRowFromSanity(
    section: PageSectionVideoCaseStudiesRowDoc,
) {
    const mapped = mapVideoCaseStudiesRow(section);
    if (mapped.cards.length === 0) return null;
    return (
        <VideoCaseStudiesRow
            content={mapped}
            id={`video-case-studies-${section._key}`}
        />
    );
}

function TestimonialsRowFromSanity(section: PageSectionTestimonialsRowDoc) {
    const mapped = mapTestimonialsRow(section);
    return (
        <TestimonialsRow
            sectionId={`section-reviews-${section._key}`}
            items={mapped.items}
            aggregate={mapped.aggregate}
            title={mapped.heading}
            description={mapped.intro}
            eyebrow={mapped.eyebrow}
            align={mapped.align}
            borderTop={mapped.borderTop}
            borderBottom={mapped.borderBottom}
            paddingBlock={mapped.paddingBlock}
            cta={mapped.cta}
        />
    );
}

/**
 * Components receive the GROQ section doc. Only wired types are registered;
 * unknown `_type`s are handled by SectionRenderer (no-op / dev alert).
 */
export const SECTION_COMPONENTS: Record<
    string,
    ComponentType<PageSection> | undefined
> = {
    faqSection: FaqSectionFromSanity as ComponentType<PageSection>,
    logoWall: LogoWallFromSanity as ComponentType<PageSection>,
    mediaFeature: MediaFeatureFromSanity as ComponentType<PageSection>,
    expertiseSequence:
        ExpertiseSequenceFromSanity as ComponentType<PageSection>,
    caseStudiesRow: CaseStudiesRowFromSanity as ComponentType<PageSection>,
    inspirationsGrid: InspirationsGridFromSanity as ComponentType<PageSection>,
    videoCaseStudiesRow:
        VideoCaseStudiesRowFromSanity as ComponentType<PageSection>,
    testimonialsRow: TestimonialsRowFromSanity as ComponentType<PageSection>,
};
