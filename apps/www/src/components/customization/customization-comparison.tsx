import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';
import {SectionHeading} from '@/components/ui/section-heading';

export const CUSTOMIZATION_COMPARISON_ID = 'customization-comparison';

type CustomizationComparisonProps = {
    className?: string;
};

/**
 * How it stacks up — section chrome only (PROD-1299 Slice G).
 * Compare feature matrix mounts in the slot below in a later slice.
 */
export function CustomizationComparison({
    className,
}: CustomizationComparisonProps) {
    return (
        <section
            id={CUSTOMIZATION_COMPARISON_ID}
            className={cn('scroll-mt-32', className)}
        >
            <PageDielineSection innerClassName="border-b border-dashed border-border py-16 sm:py-20">
                <SectionHeading
                    eyebrow="Comparison"
                    title="How it stacks up"
                    description="See how this option compares on the same stated facts as related choices in its category — so you can pick with confidence before you configure."
                    descriptionClassName="text-base leading-6"
                />

                {/* Slot: future compare-feature component (peer matrix). */}
                <div
                    className="mt-12 rounded-control border border-dashed border-border bg-muted/30 px-4 py-10 text-center"
                    data-slot="customization-compare-feature"
                >
                    <p className="text-sm text-muted-foreground">
                        Comparison view coming soon.
                    </p>
                </div>
            </PageDielineSection>
        </section>
    );
}
