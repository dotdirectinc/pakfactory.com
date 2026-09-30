import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {SectionHeading} from '@/components/ui/section-heading';
import type {StatsContent} from '@/lib/sections/map-stats';

type StatsProps = {
    content: StatsContent;
    /** Section landmark id. */
    id?: string;
    className?: string;
};

/**
 * Stats — numeric proof as figure + label (Studio `stats`, PROD-2666).
 * Props-only RSC. Figures are separated by the dashed dieline rule rather than
 * boxed as cards: they are statements, not containers (DESIGN.md § Cards).
 */
export function Stats({content, id = 'stats', className}: StatsProps) {
    const {eyebrow, heading, intro, items, align, borderTop, borderBottom, cta} =
        content;
    if (items.length === 0) return null;
    const headingId = `${id}-heading`;

    return (
        <section
            id={id}
            aria-labelledby={heading ? headingId : undefined}
            className={cn('scroll-mt-32', className)}
        >
            <PageDielineSection
                as="div"
                borderTop={borderTop}
                borderBottom={borderBottom}
                paddingBlock="md"
            >
                <div className="flex flex-col gap-12">
                    {heading ? (
                        <SectionHeading
                            eyebrow={eyebrow}
                            title={<span id={headingId}>{heading}</span>}
                            description={intro}
                            align={align}
                            cta={cta}
                        />
                    ) : null}
                    <dl
                        className={cn(
                            'motion-rise grid grid-cols-1 gap-8 sm:grid-cols-2',
                            items.length >= 4 && 'lg:grid-cols-4',
                            items.length === 3 && 'lg:grid-cols-3',
                        )}
                    >
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="flex flex-col gap-2 border-l border-dashed border-border pl-6"
                            >
                                <dt className="order-2 text-base leading-7 text-muted-foreground">
                                    {item.label}
                                </dt>
                                <dd className="order-1 text-4xl font-semibold tracking-tight text-foreground tabular-nums sm:text-5xl">
                                    {item.value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </PageDielineSection>
        </section>
    );
}
