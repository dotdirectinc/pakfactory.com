import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@pakfactory/ui/components/tabs';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';
import {SectionHeading} from '@/components/ui/section-heading';
import type {StepsContent} from '@/lib/sections/map-steps';

type StepsProps = {
    content: StepsContent;
    /** Section landmark id. */
    id?: string;
    className?: string;
};

function formatIndex(index: number): string {
    return String(index + 1).padStart(2, '0');
}

/**
 * Steps — a "how it works" sequence (Studio `steps`, PROD-2578). Props-only.
 *
 * A segmented step bar (shared Tabs primitive — arrow keys move between steps)
 * over one step at a time: number, title, body and an optional link to where
 * the step continues (e.g. the Prototyping stage page). Muted band.
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

    const headingId = `${id}-heading`;

    return (
        <section
            id={id}
            aria-labelledby={heading ? headingId : undefined}
            className={cn('scroll-mt-32', className)}
        >
            <PageDielineSection
                as="div"
                band="muted"
                borderTop={borderTop}
                borderBottom={borderBottom}
                paddingBlock="lg"
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
                    <Tabs defaultValue={items[0]?.id} className="gap-12">
                        <div className="overflow-x-auto lg:flex lg:justify-center">
                            <TabsList
                                aria-label={heading ?? 'Steps'}
                                className="h-auto gap-1 rounded-full bg-background p-1"
                            >
                                {items.map((item) => (
                                    <TabsTrigger
                                        key={item.id}
                                        value={item.id}
                                        className="h-auto flex-none rounded-full px-4 py-2 data-[state=active]:bg-muted data-[state=active]:shadow-none"
                                    >
                                        {item.title}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>
                        {items.map((item, index) => (
                            <TabsContent
                                key={item.id}
                                value={item.id}
                                className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2"
                            >
                                <div className="flex flex-col gap-4">
                                    <span className="font-mono text-sm text-muted-foreground">
                                        {formatIndex(index)}
                                    </span>
                                    <h3 className="text-3xl font-semibold leading-tight text-foreground">
                                        {item.title}
                                    </h3>
                                    {item.body ? (
                                        <p className="text-base leading-7 text-muted-foreground">
                                            {item.body}
                                        </p>
                                    ) : null}
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
                                </div>
                                <div
                                    aria-hidden
                                    className="flex aspect-[4/3] items-center justify-center rounded-lg bg-background"
                                >
                                    <span className="font-mono text-6xl text-muted-foreground">
                                        {formatIndex(index)}
                                        <span className="text-foreground/20">
                                            /{formatIndex(items.length - 1)}
                                        </span>
                                    </span>
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </div>
            </PageDielineSection>
        </section>
    );
}
