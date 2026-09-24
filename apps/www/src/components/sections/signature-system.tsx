'use client';

import {useCallback, useEffect, useState} from 'react';
import {ArrowDown} from 'lucide-react';

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@pakfactory/ui/components/accordion';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';
import {SectionHeading} from '@/components/ui/section-heading';
import {SystemRing} from '@/components/ui/system-ring';
import type {SignatureSystemContent} from '@/lib/sections/map-signature-system';
import {sectionThemeShell} from '@/lib/ui/section-theme';

type SignatureSystemProps = {
    content: SignatureSystemContent;
    /** Section landmark id. */
    id?: string;
    className?: string;
};

/** Accordion open/close duration (`animate-accordion-*`, = `--motion-base`). */
const ACCORDION_SETTLE_MS = 300;

function formatIndex(index: number): string {
    return String(index + 1).padStart(2, '0');
}

function prefersReducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

/**
 * Signature system — why a stage matters (problems) + its named method
 * (dimensions). Studio `signatureSystem`, PROD-2577. Props-only.
 *
 * A problem label opens the dimension that answers it and scrolls to it;
 * `#<dimension>` in the URL opens that dimension on load. The ring is a
 * decorative legend of the open dimension — the disclosure list is the control.
 */
export function SignatureSystem({
    content,
    id = 'signature-system',
    className,
}: SignatureSystemProps) {
    const {
        eyebrow,
        heading,
        intro,
        body,
        problems,
        problemsCaption,
        systemName,
        systemHeading,
        systemIntro,
        dimensions,
        align,
        borderTop,
        borderBottom,
        cta,
    } = content;

    const [openId, setOpenId] = useState<string>(dimensions[0]?.id ?? '');

    const anchorFor = useCallback(
        (dimensionId: string) => `${id}-${dimensionId}`,
        [id],
    );

    const reveal = useCallback(
        (dimensionId: string) => {
            setOpenId(dimensionId);
            window.history.replaceState(null, '', `#${dimensionId}`);
            // Wait for the open/close animation: scrolling while the previous
            // item collapses above the target lands short.
            const reduced = prefersReducedMotion();
            window.setTimeout(
                () => {
                    document
                        .getElementById(anchorFor(dimensionId))
                        ?.scrollIntoView({
                            behavior: reduced ? 'auto' : 'smooth',
                            block: 'start',
                        });
                },
                reduced ? 0 : ACCORDION_SETTLE_MS,
            );
        },
        [anchorFor],
    );

    // Deep link: `/expertise/strategy#value-engineering` opens that dimension.
    useEffect(() => {
        const hash = decodeURIComponent(window.location.hash.slice(1));
        if (hash && dimensions.some((dimension) => dimension.id === hash)) {
            reveal(hash);
        }
    }, [dimensions, reveal]);

    const shell = sectionThemeShell('default');
    const headingId = `${id}-heading`;
    const openIndex = dimensions.findIndex(
        (dimension) => dimension.id === openId,
    );
    const hasWhy = body.length > 0 || problems.length > 0;

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
                <div className="flex flex-col gap-16">
                    {heading ? (
                        <SectionHeading
                            eyebrow={eyebrow}
                            title={<span id={headingId}>{heading}</span>}
                            description={intro}
                            descriptionClassName="text-base text-foreground"
                            align={align}
                            cta={cta}
                        />
                    ) : null}
                    {hasWhy ? (
                        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
                            <div className="flex flex-col gap-6">
                                {body.map((paragraph, index) => (
                                    <p
                                        key={index}
                                        className="text-sm leading-6 text-muted-foreground"
                                    >
                                        {paragraph}
                                    </p>
                                ))}
                            </div>
                            {problems.length > 0 ? (
                                <div className="flex flex-col justify-center gap-4">
                                    <ul className="flex flex-col gap-4">
                                        {problems.map((problem, index) => {
                                            const chipClass =
                                                'inline-flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground';
                                            const label = (
                                                <>
                                                    <span className="font-mono text-sm font-semibold">
                                                        {formatIndex(index)}
                                                    </span>
                                                    <span>{problem.label}</span>
                                                </>
                                            );
                                            return (
                                                <li key={`${problem.label}-${index}`}>
                                                    {problem.dimensionId ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                reveal(
                                                                    problem.dimensionId as string,
                                                                )
                                                            }
                                                            aria-controls={anchorFor(
                                                                problem.dimensionId,
                                                            )}
                                                            className={cn(
                                                                chipClass,
                                                                'transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                                            )}
                                                        >
                                                            {label}
                                                            <Icon
                                                                icon={ArrowDown}
                                                                className="text-muted-foreground"
                                                            />
                                                        </button>
                                                    ) : (
                                                        <span className={chipClass}>
                                                            {label}
                                                        </span>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    {problemsCaption ? (
                                        <p className="text-sm font-semibold text-foreground">
                                            {problemsCaption}
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    <div
                        className={cn(
                            'grid grid-cols-1 items-start gap-12 lg:grid-cols-2',
                            (heading || hasWhy) &&
                                'border-t border-dashed border-border pt-16',
                        )}
                    >
                        <div className="flex flex-col gap-8">
                            {systemHeading || systemIntro ? (
                                <div className="flex flex-col gap-4">
                                    {systemHeading ? (
                                        <h3 className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                                            {systemHeading}
                                        </h3>
                                    ) : null}
                                    {systemIntro ? (
                                        <p className="text-sm leading-6 text-muted-foreground">
                                            {systemIntro}
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}
                            <Accordion
                                type="single"
                                collapsible
                                value={openId}
                                onValueChange={setOpenId}
                                className="flex flex-col"
                            >
                                {dimensions.map((dimension, index) => (
                                    <AccordionItem
                                        key={dimension.id}
                                        id={anchorFor(dimension.id)}
                                        value={dimension.id}
                                        className="scroll-mt-32 border-border"
                                    >
                                        <AccordionTrigger className="items-center gap-4 py-6 text-base font-semibold text-foreground hover:no-underline">
                                            <span className="flex min-w-0 flex-1 items-center gap-4 text-left">
                                                <span className="font-mono text-sm text-muted-foreground">
                                                    {formatIndex(index)}
                                                </span>
                                                <span className="leading-snug">
                                                    {dimension.title}
                                                </span>
                                            </span>
                                        </AccordionTrigger>
                                        <AccordionContent className="flex flex-col gap-4 pb-6 pl-8">
                                            {dimension.summary ? (
                                                <p className="text-sm leading-6 text-foreground">
                                                    {dimension.summary}
                                                </p>
                                            ) : null}
                                            {dimension.points.length > 0 ? (
                                                <ul className="flex list-disc flex-col gap-2 pl-4 text-sm text-muted-foreground">
                                                    {dimension.points.map((point) => (
                                                        <li key={point.label}>
                                                            <span className="text-foreground">
                                                                {point.label}
                                                            </span>
                                                            {point.gloss ? (
                                                                <> — {point.gloss}</>
                                                            ) : null}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : null}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                        <SystemRing
                            name={systemName}
                            count={dimensions.length}
                            activeIndex={openIndex}
                            activeLabel={
                                openIndex >= 0
                                    ? `${formatIndex(openIndex)} · ${dimensions[openIndex]?.title}`
                                    : undefined
                            }
                            className="mx-auto w-full max-w-sm lg:sticky lg:top-32"
                        />
                    </div>
                </div>
            </PageDielineSection>
        </section>
    );
}
