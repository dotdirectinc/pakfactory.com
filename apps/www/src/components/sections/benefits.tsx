import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';
import {SectionHeading} from '@/components/ui/section-heading';
import type {BenefitsContent} from '@/lib/sections/map-benefits';
import {sectionThemeShell} from '@/lib/ui/section-theme';

type BenefitsProps = {
    content: BenefitsContent;
    /** Section landmark id. */
    id?: string;
    className?: string;
};

/**
 * Benefits — outcome statements as a card grid (Studio `benefits`, PROD-2577).
 * Props-only. Cards are not links; columns follow item count up to four.
 */
export function Benefits({content, id = 'benefits', className}: BenefitsProps) {
    const {
        eyebrow,
        heading,
        intro,
        items,
        align,
        borderTop,
        borderBottom,
        cta,
    } = content;
    if (items.length === 0) return null;

    const shell = sectionThemeShell('default');
    const headingId = `${id}-heading`;

    return (
        <section
            id={id}
            aria-labelledby={heading ? headingId : undefined}
            data-section-theme={shell['data-section-theme']}
            className={cn('scroll-mt-32', shell.bandClass, className)}
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
                    {/* Rises in as it enters (scroll-driven, `motion-rise`). */}
                    <ul
                        className={cn(
                            'motion-rise grid grid-cols-1 gap-4 sm:grid-cols-2',
                            items.length >= 4 && 'lg:grid-cols-4',
                            items.length === 3 && 'lg:grid-cols-3',
                        )}
                    >
                        {items.map((item) => (
                            <li
                                key={item.id}
                                // Colour response only — these cells are not links, so no
                                // lift or shadow (a pressable look that goes nowhere).
                                className="group flex flex-col gap-4 rounded-2xl border border-border bg-muted/40 p-8 transition-colors duration-300 hover:border-foreground/25 hover:bg-muted motion-reduce:transition-none"
                            >
                                <span className="flex size-10 items-center justify-center rounded-full bg-background text-foreground transition-colors duration-300 group-hover:bg-foreground group-hover:text-background motion-reduce:transition-none">
                                    <Icon icon={item.icon} size="md" />
                                </span>
                                <div className="flex flex-col gap-2">
                                    <h3 className="text-lg font-medium leading-snug text-foreground">
                                        {item.title}
                                    </h3>
                                    {item.body ? (
                                        <p className="text-base leading-7 text-muted-foreground">
                                            {item.body}
                                        </p>
                                    ) : null}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </PageDielineSection>
        </section>
    );
}
