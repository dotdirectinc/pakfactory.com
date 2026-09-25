'use client';

import {useCallback, useEffect, useState} from 'react';
import Image from 'next/image';
import {ArrowDown, Minus, Plus} from 'lucide-react';

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
import type {
    SignatureDimension,
    SignatureSystemContent,
} from '@/lib/sections/map-signature-system';

type SignatureSystemProps = {
    content: SignatureSystemContent;
    /** Section landmark id. */
    id?: string;
    className?: string;
};

/** Accordion open/close duration (`animate-accordion-*`, = `--motion-base`). */
const ACCORDION_SETTLE_MS = 300;

/**
 * Staggered offsets for the problem chips (8pt grid, `lg+` only) — the labels
 * read as scattered symptoms before the framework puts them in order.
 */
const CHIP_OFFSET_CLASS = ['lg:ml-0', 'lg:ml-16', 'lg:ml-4', 'lg:ml-20', 'lg:ml-8', 'lg:ml-12'];

function formatIndex(index: number): string {
    return String(index + 1).padStart(2, '0');
}

function prefersReducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

function DimensionBody({dimension}: {dimension: SignatureDimension}) {
    return (
        <>
            {dimension.summary ? (
                <p className="text-sm leading-6">{dimension.summary}</p>
            ) : null}
            {dimension.points.length > 0 ? (
                <ul className="flex list-disc flex-col gap-2 pl-4 text-sm">
                    {dimension.points.map((point) => (
                        <li key={point.label}>
                            {point.label}
                            {point.gloss ? <> — {point.gloss}</> : null}
                        </li>
                    ))}
                </ul>
            ) : null}
        </>
    );
}

/**
 * Signature system — why a stage matters (problems) + how PakFactory approaches
 * it (dimensions). Studio `signatureSystem`, PROD-2577 / PROD-2578. Props-only.
 *
 * Two bands: the "why" on the page background, the method on the muted band.
 * Presentation follows the data, not a layout field (D35):
 * - **Named method** (Strategy's 360° Strategic Framework) → disclosure list +
 *   decorative ring. A problem label opens the dimension that answers it.
 * - **No named method** (Design) → service cards; `+` reveals the summary.
 *
 * `#<dimension>` in the URL opens that dimension on load.
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

    const named = Boolean(systemName);
    const [openId, setOpenId] = useState<string>(
        named ? (dimensions[0]?.id ?? '') : '',
    );

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

    // Deep link: `/expertise/<stage>#value-engineering` opens that dimension.
    useEffect(() => {
        const hash = decodeURIComponent(window.location.hash.slice(1));
        if (hash && dimensions.some((dimension) => dimension.id === hash)) {
            reveal(hash);
        }
    }, [dimensions, reveal]);

    const headingId = `${id}-heading`;
    const openIndex = dimensions.findIndex(
        (dimension) => dimension.id === openId,
    );
    const hasWhy = body.length > 0 || problems.length > 0;

    const sectionHeading = heading ? (
        <SectionHeading
            eyebrow={eyebrow}
            title={<span id={headingId}>{heading}</span>}
            description={intro}
            descriptionClassName="text-base text-foreground"
            align={align}
            cta={cta}
        />
    ) : null;

    const systemIntroBlock =
        systemHeading || systemIntro ? (
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
        ) : null;

    return (
        <section
            id={id}
            aria-labelledby={heading ? headingId : undefined}
            className={cn('scroll-mt-32', className)}
        >
            {hasWhy ? (
                <PageDielineSection
                    as="div"
                    band="default"
                    borderTop={borderTop}
                    paddingBlock="lg"
                >
                    {sectionHeading ? (
                        <div className="mb-12">{sectionHeading}</div>
                    ) : null}
                    <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
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
                            <div className="flex flex-col gap-6">
                                <ul className="flex flex-col items-start gap-4">
                                    {problems.map((problem, index) => {
                                        const chipClass = cn(
                                            'inline-flex items-center gap-4 rounded-lg bg-card px-4 py-2 text-sm text-foreground shadow-sm ring-1 ring-border',
                                            CHIP_OFFSET_CLASS[
                                                index % CHIP_OFFSET_CLASS.length
                                            ],
                                        );
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
                                                            'transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                                        )}
                                                    >
                                                        {label}
                                                        <span className="flex size-6 items-center justify-center rounded-full bg-muted">
                                                            <Icon icon={ArrowDown} />
                                                        </span>
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
                </PageDielineSection>
            ) : null}

            <PageDielineSection
                as="div"
                band="muted"
                borderTop={hasWhy || borderTop}
                borderBottom={borderBottom}
                paddingBlock="lg"
            >
                {named ? (
                    <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
                        <div className="flex flex-col gap-8">
                            {hasWhy ? null : sectionHeading}
                            {systemIntroBlock}
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
                                        <AccordionContent className="flex flex-col gap-4 pb-6 pl-8 text-foreground">
                                            <DimensionBody dimension={dimension} />
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                        <SystemRing
                            name={systemName as string}
                            count={dimensions.length}
                            activeIndex={openIndex}
                            activeLabel={
                                openIndex >= 0
                                    ? `${formatIndex(openIndex)} · ${dimensions[openIndex]?.title}`
                                    : undefined
                            }
                            className="mx-auto w-full max-w-md lg:sticky lg:top-32"
                        />
                    </div>
                ) : (
                    <div className="flex flex-col gap-12">
                        {hasWhy ? systemIntroBlock : (sectionHeading ?? systemIntroBlock)}
                        <ul
                            className={cn(
                                'grid grid-cols-1 gap-4 sm:grid-cols-2',
                                dimensions.length >= 4 && 'lg:grid-cols-4',
                                dimensions.length === 3 && 'lg:grid-cols-3',
                            )}
                        >
                            {dimensions.map((dimension, index) => {
                                const open = openId === dimension.id;
                                const panelId = `${anchorFor(dimension.id)}-panel`;
                                return (
                                    <li
                                        key={dimension.id}
                                        id={anchorFor(dimension.id)}
                                        className="relative flex aspect-[3/4] scroll-mt-32 flex-col overflow-hidden rounded-lg bg-foreground text-background"
                                    >
                                        {dimension.image ? (
                                            <>
                                                <Image
                                                    src={dimension.image.src}
                                                    alt={dimension.image.alt}
                                                    fill
                                                    className="object-cover"
                                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                                />
                                                <span
                                                    aria-hidden
                                                    className="absolute inset-0 bg-gradient-to-b from-foreground/70 via-transparent to-foreground/70"
                                                />
                                            </>
                                        ) : null}
                                        <div className="relative flex flex-col gap-2 p-6">
                                            <span className="font-mono text-xs text-background/70">
                                                {formatIndex(index)}
                                            </span>
                                            <h3 className="text-lg font-semibold leading-snug">
                                                {dimension.title}
                                            </h3>
                                        </div>
                                        <div
                                            id={panelId}
                                            hidden={!open}
                                            className="relative mt-auto flex flex-col gap-4 bg-foreground/90 p-6 pb-20"
                                        >
                                            <DimensionBody dimension={dimension} />
                                        </div>
                                        <button
                                            type="button"
                                            aria-expanded={open}
                                            aria-controls={panelId}
                                            aria-label={`${open ? 'Hide' : 'Show'} ${dimension.title}`}
                                            onClick={() =>
                                                setOpenId(open ? '' : dimension.id)
                                            }
                                            className="absolute right-4 bottom-4 flex size-10 items-center justify-center rounded-full bg-background text-foreground transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            <Icon icon={open ? Minus : Plus} size="md" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </PageDielineSection>
        </section>
    );
}
