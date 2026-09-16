import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import type {ProductTestimonial} from '@/lib/catalog/types';
import {
    sectionThemeShell,
    type SectionTheme,
} from '@/lib/ui/section-theme';

type TestimonialsRowProps = {
    heading?: string;
    items: ProductTestimonial[];
    className?: string;
    /** Section color band (not app dark/light mode). */
    theme?: SectionTheme;
};

/**
 * Buyer quote cards — future testimonials row (PROD-2293). No star ratings.
 */
export function TestimonialsRow({
    heading = 'What buyers say',
    items,
    className,
    theme = 'default',
}: TestimonialsRowProps) {
    const shell = sectionThemeShell(theme);

    if (items.length === 0) return null;

    return (
        <section
            id="pdp-testimonials"
            data-section-theme={shell['data-section-theme']}
            className={cn('scroll-mt-20', shell.bandClass, className)}
        >
            <PageDielineSection innerClassName="border-b border-dashed border-border py-16 sm:py-20">
                <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-semibold text-brand-blue sm:text-3xl">
                        {heading}
                    </h2>
                </div>

                <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                    {items.map((item, index) => (
                        <li
                            key={`${item.attributionName ?? 'quote'}-${index}`}
                            className={cn(
                                'flex flex-col gap-4 rounded-lg border border-border bg-card p-6',
                                shell.elevatedClass,
                            )}
                        >
                            <blockquote className="text-sm leading-relaxed text-foreground">
                                “{item.quote}”
                            </blockquote>
                            {(item.attributionName || item.attributionRole) && (
                                <footer className="mt-auto flex flex-col gap-1">
                                    {item.attributionName ? (
                                        <cite className="text-sm font-semibold not-italic text-brand-blue">
                                            {item.attributionName}
                                        </cite>
                                    ) : null}
                                    {item.attributionRole ? (
                                        <span className="text-xs text-muted-foreground">
                                            {item.attributionRole}
                                        </span>
                                    ) : null}
                                </footer>
                            )}
                        </li>
                    ))}
                </ul>
            </PageDielineSection>
        </section>
    );
}
