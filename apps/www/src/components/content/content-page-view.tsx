import type {ContentPageDoc} from '@pakfactory/sanity/queries';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {SectionRenderer} from '@/components/sections/section-renderer';
import type {PageSection} from '@/components/sections/registry';

type ContentPageViewProps = {
    page: ContentPageDoc;
    /** Extra bands after CMS sections (e.g. Contact details). */
    afterSections?: React.ReactNode;
};

/**
 * Content Page body — CMS `sections[]` via SectionRenderer. When the document
 * has no sections yet, a plain H1 from the title keeps the page accessible.
 */
export function ContentPageView({page, afterSections}: ContentPageViewProps) {
    const sections = (page.sections ?? []) as PageSection[];
    const title = page.title?.trim() || 'Page';
    const hasSections = sections.length > 0;

    return (
        <main className="min-h-screen bg-background">
            {hasSections ? null : <PageHeadingSection title={title} />}
            <SectionRenderer sections={sections} />
            {afterSections}
        </main>
    );
}
