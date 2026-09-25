import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';
import {SectionHeading} from '@/components/ui/section-heading';
import type {StepsContent} from '@/lib/sections/map-steps';
import {sectionThemeShell} from '@/lib/ui/section-theme';

type StepsProps = {
    content: StepsContent;
    /** Section landmark id. */
    id?: string;
    className?: string;
};

/**
 * Steps — a numbered "how it works" sequence (Studio `steps`, PROD-2578).
 * Props-only. An ordered list, so the order is announced; a step may link to
 * where it continues (e.g. the Prototyping stage page).
 */
export function Steps({content, id = 'steps', className}: StepsProps) {
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
                    <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((item, index) => (
                            <li
                                key={item.id}
                                className="flex flex-col gap-4 rounded-lg border border-border bg-card p-8"
                            >
                                <span className="font-mono text-sm text-muted-foreground">
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                                <div className="flex flex-1 flex-col gap-2">
                                    <h3 className="text-lg font-semibold text-foreground">
                                        {item.title}
                                    </h3>
                                    {item.body ? (
                                        <p className="text-sm leading-6 text-muted-foreground">
                                            {item.body}
                                        </p>
                                    ) : null}
                                </div>
                                {item.link ? (
                                    <Link
                                        href={item.link.href}
                                        className="group inline-flex items-center gap-2 text-sm font-medium text-foreground"
                                    >
                                        <span className="underline-offset-4 group-hover:underline">
                                            {item.link.label}
                                        </span>
                                        <Icon icon={ArrowRight} />
                                    </Link>
                                ) : null}
                            </li>
                        ))}
                    </ol>
                </div>
            </PageDielineSection>
        </section>
    );
}
