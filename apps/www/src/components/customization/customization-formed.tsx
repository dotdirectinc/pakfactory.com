import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';
import {SectionHeading} from '@/components/ui/section-heading';

export const CUSTOMIZATION_FORMED_ID = 'customization-formed';

type CustomizationFormedProps = {
    className?: string;
};

/**
 * How it’s formed — section chrome only (PROD-1299 Slice H).
 * Glossary visual + definition mounts in the slot below in a later slice.
 */
export function CustomizationFormed({className}: CustomizationFormedProps) {
    return (
        <section
            id={CUSTOMIZATION_FORMED_ID}
            className={cn('scroll-mt-32', className)}
        >
            <PageDielineSection innerClassName="border-b border-dashed border-border py-16 sm:py-20">
                <SectionHeading
                    eyebrow="Process"
                    title="How it’s formed"
                    description="A quick look at how this option is made and what that means for structure, print, and performance."
                    descriptionClassName="text-base leading-6"
                />

                {/* Slot: future glossary visual + definition feature. */}
                <div
                    className="mt-12 rounded-control border border-dashed border-border bg-muted/30 px-4 py-10 text-center"
                    data-slot="customization-formed-feature"
                >
                    <p className="text-sm text-muted-foreground">
                        Process detail coming soon.
                    </p>
                </div>
            </PageDielineSection>
        </section>
    );
}
