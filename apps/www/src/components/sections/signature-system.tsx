'use client';

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type MouseEvent,
    type PointerEvent,
} from 'react';
import Image from 'next/image';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {ArrowRight, ChevronDown, Plus} from 'lucide-react';

import {
    PageDielineSection,
    pageDielineInnerClass,
    pageDielineOuterClass,
} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';
import {
    MorphFrameworkGraphic,
    type MorphLabel,
} from '@/components/ui/morph-framework-graphic';
import {SectionHeading} from '@/components/ui/section-heading';
import {SystemRing} from '@/components/ui/system-ring';
import type {
    SignatureDimension,
    SignatureProblem,
    SignatureSystemContent,
} from '@/lib/sections/map-signature-system';
import {
    BAND_PAD,
    MORPH_COUNT,
    STICKY_TOP,
} from '@/lib/ui/morph-framework';
import {useIsomorphicLayoutEffect} from '@/lib/ui/use-isomorphic-layout-effect';

gsap.registerPlugin(ScrollTrigger);

type SignatureSystemProps = {
    content: SignatureSystemContent;
    /** Section landmark id. */
    id?: string;
    className?: string;
};

const numeral = (index: number) => String(index + 1).padStart(2, '0');

const reducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** "360° Strategic Framework" → centre "360°" + sub "Strategic Framework". */
function splitSystemName(name: string): {lead: string; sub?: string} {
    const match = name.trim().match(/^(\S*\d\S*)\s+(.+)$/);
    return match ? {lead: match[1] as string, sub: match[2]} : {lead: name};
}

function PointList({points}: {points: SignatureDimension['points']}) {
    if (points.length === 0) return null;
    return (
        <ul className="flex list-disc flex-col gap-2 pl-4 text-sm leading-6">
            {points.map((point) => (
                <li key={point.label}>
                    {point.label}
                    {point.gloss ? <> — {point.gloss}</> : null}
                </li>
            ))}
        </ul>
    );
}

/**
 * Always-one-open disclosure list (POC `DimensionDisclosureList`): the open
 * row has nothing to do but stays focusable; panels switch instantly (no
 * height animation) and reserve their height so a sticky graphic beside the
 * list never reflows.
 */
function DisclosureList({
    triggerId,
    dimensions,
    activeIndex,
    onSelect,
}: {
    triggerId: (dimensionId: string) => string;
    dimensions: SignatureDimension[];
    activeIndex: number;
    onSelect: (dimensionId: string) => void;
}) {
    return (
        <ul className="flex flex-col">
            {dimensions.map((dimension, index) => {
                const open = index === activeIndex;
                const panelId = `${triggerId(dimension.id)}-panel`;
                return (
                    <li
                        key={dimension.id}
                        className="border-t border-border last:border-b"
                    >
                        <h3>
                            <button
                                type="button"
                                id={triggerId(dimension.id)}
                                aria-expanded={open}
                                aria-controls={panelId}
                                aria-disabled={open || undefined}
                                onClick={() => !open && onSelect(dimension.id)}
                                className="flex w-full scroll-mt-32 items-center gap-4 py-5 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                            >
                                <span
                                    className={cn(
                                        'font-mono text-xs',
                                        open ? 'text-foreground' : 'text-muted-foreground',
                                    )}
                                >
                                    {numeral(index)}
                                </span>
                                <span
                                    className={cn(
                                        'flex-1 text-lg font-medium transition-colors motion-reduce:transition-none',
                                        open ? 'text-foreground' : 'text-muted-foreground',
                                    )}
                                >
                                    {dimension.title}
                                </span>
                                <Icon
                                    icon={ChevronDown}
                                    className={cn(
                                        'shrink-0 text-muted-foreground transition-transform duration-300 motion-reduce:transition-none',
                                        open && 'rotate-180',
                                    )}
                                />
                            </button>
                        </h3>
                        <div
                            id={panelId}
                            role="region"
                            aria-labelledby={triggerId(dimension.id)}
                            hidden={!open}
                            className="flex flex-col gap-4 pb-8 pl-10 pr-4 text-foreground lg:min-h-62"
                        >
                            {dimension.summary ? (
                                <p className="max-w-xl text-base leading-7">
                                    {dimension.summary}
                                </p>
                            ) : null}
                            <PointList points={dimension.points} />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

/** Problems as a list with the dimension each resolves to (mobile / static). */
function ProblemLabelList({
    problems,
    dimensions,
    onResolve,
}: {
    problems: SignatureProblem[];
    dimensions: SignatureDimension[];
    onResolve: (event: MouseEvent, dimensionId: string) => void;
}) {
    return (
        <ul className="flex flex-col">
            {problems.map((problem, index) => {
                const target = problem.dimensionId
                    ? dimensions.findIndex((d) => d.id === problem.dimensionId)
                    : -1;
                if (target < 0 || !problem.dimensionId) {
                    return (
                        <li
                            key={`${problem.label}-${index}`}
                            className="border-b border-border py-4 text-base font-medium text-foreground last:border-b-0"
                        >
                            {problem.label}
                        </li>
                    );
                }
                const dimensionId = problem.dimensionId;
                return (
                    <li
                        key={`${problem.label}-${index}`}
                        className="border-b border-border last:border-b-0"
                    >
                        <button
                            type="button"
                            onClick={(event) => onResolve(event, dimensionId)}
                            className="group flex w-full items-center gap-4 py-4 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                        >
                            <span className="flex min-w-0 flex-1 flex-col gap-1">
                                <span className="text-base font-medium text-foreground">
                                    {problem.label}
                                </span>
                                <span className="text-xs leading-5 text-muted-foreground">
                                    {numeral(target)} {dimensions[target]?.title}
                                </span>
                            </span>
                            <Icon
                                icon={ArrowRight}
                                className="shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
                            />
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

/**
 * Service panels (no named method — Design): four panels in a row that share
 * the width; the one under the pointer or focus grows (flex-grow 1 → 4), its
 * dim lifts and its + turns. Leaving the row folds them all. Below md they stack.
 */
function ServicePanels({
    anchorFor,
    dimensions,
}: {
    anchorFor: (dimensionId: string) => string;
    dimensions: SignatureDimension[];
}) {
    const [openId, setOpenId] = useState<string | null>(null);

    // Deep link `#<service>` opens that panel.
    useEffect(() => {
        const hash = decodeURIComponent(window.location.hash.slice(1));
        if (hash && dimensions.some((d) => d.id === hash)) setOpenId(hash);
    }, [dimensions]);

    return (
        <ul
            className="flex flex-col gap-4 md:h-104 md:flex-row"
            onPointerLeave={() => setOpenId(null)}
        >
            {dimensions.map((dimension, index) => {
                const open = openId === dimension.id;
                const itemId = anchorFor(dimension.id);
                const panelId = `${itemId}-panel`;
                return (
                    <li
                        key={dimension.id}
                        id={itemId}
                        style={{flexGrow: open ? 4 : 1}}
                        onPointerEnter={() => setOpenId(dimension.id)}
                        onFocus={() => setOpenId(dimension.id)}
                        className="relative min-h-72 min-w-0 scroll-mt-32 overflow-hidden rounded-xl bg-foreground text-background transition-[flex-grow] duration-500 ease-out motion-reduce:transition-none md:h-full md:min-h-0 md:basis-0"
                    >
                        {dimension.image ? (
                            <Image
                                src={dimension.image.src}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 50vw"
                            />
                        ) : null}
                        {/* Always-on gradient keeps the copy legible on any photo;
                            the flat dim is the state — it lifts from the open panel. */}
                        <span
                            aria-hidden
                            className="absolute inset-0 bg-gradient-to-b from-foreground/80 via-foreground/40 to-foreground/55"
                        />
                        <span
                            aria-hidden
                            className={cn(
                                'absolute inset-0 bg-foreground/45 transition-opacity duration-500 ease-out motion-reduce:transition-none',
                                open ? 'opacity-0' : 'opacity-100',
                            )}
                        />
                        <div className="relative flex h-full min-h-72 flex-col items-start gap-4 p-6 md:min-h-0">
                            <span className="font-mono text-xs text-background/60">
                                {numeral(index)}
                            </span>
                            <h3 className="text-lg font-medium leading-snug">
                                <button
                                    type="button"
                                    onClick={() => setOpenId(dimension.id)}
                                    aria-expanded={open}
                                    aria-controls={panelId}
                                    className={cn(
                                        'text-left text-background focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-background',
                                        // Closed, the whole panel is the hit area.
                                        !open && 'after:absolute after:inset-0',
                                    )}
                                >
                                    {dimension.title}
                                </button>
                            </h3>
                            <div
                                id={panelId}
                                hidden={!open}
                                className="flex flex-col gap-4 text-background/85"
                            >
                                {dimension.summary ? (
                                    <p className="max-w-prose text-sm leading-6">
                                        {dimension.summary}
                                    </p>
                                ) : null}
                                <PointList points={dimension.points} />
                            </div>
                            <Icon
                                icon={Plus}
                                size="md"
                                className={cn(
                                    'absolute right-6 bottom-6 text-background transition-transform duration-500 ease-out motion-reduce:transition-none',
                                    open && 'rotate-45',
                                )}
                            />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

/**
 * Signature system — why a stage matters (problems) + how PakFactory approaches
 * it (dimensions). Studio `signatureSystem`, PROD-2577 / PROD-2578. Props-only.
 *
 * Presentation follows the data (D35 — no layout field), matching the POC:
 * - **Named method + five problems ↔ five dimensions** (Strategy): the problem
 *   cards and the dial are one sticky graphic that morphs with scroll — cards
 *   lose their words, bend, turn and become the arcs (desktop). Mobile: the
 *   problems as a list, the finished dial under the framework list.
 * - **Named method, other shapes**: problem list + disclosure list + ring.
 * - **No named method** (Design): service panels that grow on hover/focus.
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

    const frameworkId = `${id}-framework`;
    const triggerId = useCallback(
        (dimensionId: string) => `${id}-${dimensionId}`,
        [id],
    );

    const [activeId, setActiveId] = useState<string>(dimensions[0]?.id ?? '');
    const activeIndex = Math.max(
        0,
        dimensions.findIndex((d) => d.id === activeId),
    );

    // Problems that resolve to a shown dimension, sorted by that dimension so
    // the stack reads 01–05 while each card flies to its own arc.
    const morphLabels: MorphLabel[] = useMemo(
        () =>
            problems
                .map((problem, index) => ({
                    id: `${index}-${problem.label}`,
                    label: problem.label,
                    at: problem.dimensionId
                        ? dimensions.findIndex((d) => d.id === problem.dimensionId)
                        : -1,
                }))
                .filter((label) => label.at >= 0)
                .sort((a, b) => a.at - b.at),
        [problems, dimensions],
    );
    const named = Boolean(systemName);
    const morphable =
        named &&
        dimensions.length === MORPH_COUNT &&
        problems.length === MORPH_COUNT &&
        morphLabels.length === MORPH_COUNT &&
        new Set(morphLabels.map((l) => l.at)).size === MORPH_COUNT;

    const {lead: centerLabel, sub: centerSub} = splitSystemName(systemName ?? '');
    const caption = `${numeral(activeIndex)} · ${dimensions[activeIndex]?.title ?? ''}`;

    /** Scroll a dimension row into view (mobile / static). */
    const goToDimension = useCallback(
        (dimensionId: string, smooth: boolean) => {
            const row = document.getElementById(triggerId(dimensionId));
            if (!row) return;
            row.focus({preventScroll: true});
            row.scrollIntoView({
                block: 'center',
                behavior: smooth && !reducedMotion() ? 'smooth' : 'auto',
            });
        },
        [triggerId],
    );

    const resolveToDimension = useCallback(
        (event: MouseEvent, dimensionId: string) => {
            event.preventDefault();
            setActiveId(dimensionId);
            requestAnimationFrame(() => {
                goToDimension(dimensionId, true);
                window.history.replaceState(null, '', `#${dimensionId}`);
            });
        },
        [goToDimension],
    );

    // Deep link on load: open the dimension and bring its row into view.
    useEffect(() => {
        if (!named) return;
        const hash = decodeURIComponent(window.location.hash.slice(1));
        if (!hash || !dimensions.some((d) => d.id === hash)) return;
        setActiveId(hash);
        requestAnimationFrame(() => goToDimension(hash, false));
    }, [named, dimensions, goToDimension]);

    // ── Morph: scroll progress + cursor parallax (desktop) ────────────────────
    const [t, setT] = useState(0);
    const [hoverIndex, setHoverIndex] = useState(-1);
    const [par, setPar] = useState({x: 0, y: 0});
    const wrapRef = useRef<HTMLDivElement>(null);
    const boxRef = useRef<HTMLDivElement>(null);
    const frameworkRef = useRef<HTMLDivElement>(null);
    const pointerTarget = useRef({x: 0, y: 0});
    const pointerCurrent = useRef({x: 0, y: 0});

    useIsomorphicLayoutEffect(() => {
        if (!morphable || !frameworkRef.current) return undefined;
        if (reducedMotion()) {
            setT(1);
            return undefined;
        }
        const trigger = ScrollTrigger.create({
            trigger: frameworkRef.current,
            // The morph opens when the card stack's bottom edge meets the problem
            // band's bottom padding, and is complete once the framework band's
            // top reaches 12% of the viewport.
            start: () =>
                `top ${STICKY_TOP + (boxRef.current?.getBoundingClientRect().height ?? 560) + BAND_PAD}px`,
            end: 'top 12%',
            invalidateOnRefresh: true,
            onUpdate: (self) => setT(self.progress),
            // Fires on create too: landing mid-page shows the right state.
            onRefresh: (self) => setT(self.progress),
        });
        // Eased follow — the cards trail the cursor and drift home when it leaves.
        const tick = () => {
            const c = pointerCurrent.current;
            const g = pointerTarget.current;
            const nx = c.x + (g.x - c.x) * 0.08;
            const ny = c.y + (g.y - c.y) * 0.08;
            if (Math.abs(nx - c.x) > 5e-4 || Math.abs(ny - c.y) > 5e-4) {
                pointerCurrent.current = {x: nx, y: ny};
                setPar(pointerCurrent.current);
            }
        };
        gsap.ticker.add(tick);
        return () => {
            trigger.kill();
            gsap.ticker.remove(tick);
        };
    }, [morphable]);

    const trackPointer = useCallback((event: PointerEvent) => {
        const box = boxRef.current?.getBoundingClientRect();
        if (!box) return;
        const clamp = (n: number) => (n < -1 ? -1 : n > 1 ? 1 : n);
        pointerTarget.current = {
            x: clamp((event.clientX - (box.left + box.width / 2)) / box.width),
            y: clamp((event.clientY - (box.top + box.height / 2)) / box.height),
        };
    }, []);
    const restPointer = useCallback(() => {
        pointerTarget.current = {x: 0, y: 0};
    }, []);

    /**
     * A problem card is a jump across the whole morph: scroll so the opened row
     * sits level with the top of the ring, never above the morph's end (that
     * would un-draw the dial) nor past the end of the sticky track.
     */
    const alignToDial = useCallback(
        (dimensionId: string) => {
            const row = document.getElementById(triggerId(dimensionId));
            const box = boxRef.current;
            const section = frameworkRef.current;
            const wrapEl = wrapRef.current;
            if (!row || !box || !section || !wrapEl) return;
            if (!window.matchMedia('(min-width: 1024px)').matches) return;
            const ringTop = box.getBoundingClientRect().width * 0.085;
            const wanted =
                window.scrollY + row.getBoundingClientRect().top - STICKY_TOP - ringTop;
            const settledAt =
                window.scrollY +
                section.getBoundingClientRect().top -
                window.innerHeight * 0.12;
            const pinnedLimit =
                window.scrollY +
                wrapEl.getBoundingClientRect().bottom -
                BAND_PAD -
                box.getBoundingClientRect().height -
                STICKY_TOP;
            window.scrollTo({
                top: Math.min(Math.max(wanted, settledAt), pinnedLimit),
                behavior: reducedMotion() ? 'auto' : 'smooth',
            });
        },
        [triggerId],
    );

    const resolveFromCard = useCallback(
        (event: MouseEvent, label: MorphLabel) => {
            event.preventDefault();
            const dimensionId = dimensions[label.at]?.id;
            if (!dimensionId) return;
            setActiveId(dimensionId);
            requestAnimationFrame(() => {
                alignToDial(dimensionId);
                window.history.replaceState(null, '', `#${dimensionId}`);
            });
        },
        [dimensions, alignToDial],
    );

    const headingId = `${id}-heading`;
    const hasWhy = body.length > 0 || problems.length > 0;

    const sectionHeading = heading ? (
        <SectionHeading
            eyebrow={eyebrow}
            title={<span id={headingId}>{heading}</span>}
            align={align}
            cta={cta}
            // SectionHeading caps itself at 2/3 of this box → a 40rem heading (POC).
            className="lg:max-w-240"
        />
    ) : null;

    const whyCopy = (
        <div className="flex flex-col gap-6">
            {intro ? (
                <p className="text-lg leading-8 text-foreground">{intro}</p>
            ) : null}
            {body.map((paragraph, index) => (
                <p key={index} className="text-base leading-7 text-muted-foreground">
                    {paragraph}
                </p>
            ))}
        </div>
    );

    const systemHeader =
        systemHeading || systemIntro ? (
            <div className="flex flex-col gap-4 lg:max-w-216">
                {systemHeading ? (
                    <h3 className="text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-foreground sm:text-[40px]">
                        {systemHeading}
                    </h3>
                ) : null}
                {systemIntro ? (
                    <p className="text-lg leading-8 text-muted-foreground">
                        {systemIntro}
                    </p>
                ) : null}
            </div>
        ) : null;

    // ── No named method: service panels ──────────────────────────────────────
    if (!named) {
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
                        ) : (
                            systemHeader
                        )}
                        <ServicePanels anchorFor={triggerId} dimensions={dimensions} />
                    </div>
                </PageDielineSection>
            </section>
        );
    }

    // ── Named method ─────────────────────────────────────────────────────────
    return (
        <section
            id={id}
            aria-labelledby={heading ? headingId : undefined}
            className={cn('scroll-mt-32', className)}
        >
            <div
                ref={wrapRef}
                className="relative"
                onPointerMove={morphable ? trackPointer : undefined}
                onPointerLeave={morphable ? restPointer : undefined}
            >
                {hasWhy || sectionHeading ? (
                    <PageDielineSection
                        as="div"
                        band="default"
                        borderTop={borderTop}
                        paddingBlock="lg"
                        innerClassName="lg:py-32"
                    >
                        <div className="flex flex-col gap-12">
                            {sectionHeading}
                            <div className="lg:grid lg:grid-cols-12 lg:gap-16">
                                <div className="flex flex-col gap-8 lg:col-span-6 lg:max-w-160">
                                    {whyCopy}
                                    {problems.length > 0 ? (
                                        <div
                                            className={cn(
                                                'rounded-xl border border-border bg-muted/50 p-6 sm:p-8',
                                                morphable && 'lg:hidden',
                                            )}
                                        >
                                            {problemsCaption ? (
                                                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                                    {problemsCaption}
                                                </p>
                                            ) : null}
                                            <div className="mt-4">
                                                <ProblemLabelList
                                                    problems={problems}
                                                    dimensions={dimensions}
                                                    onResolve={resolveToDimension}
                                                />
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </PageDielineSection>
                ) : null}

                {morphable ? (
                    // The shared graphic, in its own track so it can stick across
                    // both bands. It stops one band-padding short of the bottom,
                    // releasing level with the end of the framework content.
                    <div className="pointer-events-none absolute inset-x-0 top-0 bottom-32 z-10 hidden lg:block">
                        <div className={pageDielineOuterClass('h-full')}>
                            <div className={pageDielineInnerClass('h-full border-x-0')}>
                                <div className="grid h-full grid-cols-12 gap-16">
                                    <div className="col-span-6 col-start-7 h-full">
                                        <div ref={boxRef} className="sticky top-24">
                                            {problemsCaption ? (
                                                <p className="sr-only">{problemsCaption}</p>
                                            ) : null}
                                            <MorphFrameworkGraphic
                                                t={t}
                                                par={par}
                                                labels={morphLabels}
                                                activeIndex={activeIndex}
                                                hoverIndex={hoverIndex}
                                                onHover={setHoverIndex}
                                                onResolve={resolveFromCard}
                                                centerLabel={centerLabel}
                                                centerSub={centerSub}
                                                caption={caption}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* The band's outer edge is the ScrollTrigger target (POC parity). */}
                <div ref={frameworkRef} id={frameworkId}>
                <PageDielineSection
                    as="div"
                    band="muted"
                    borderTop={hasWhy || Boolean(sectionHeading) || borderTop}
                    borderBottom={borderBottom}
                    paddingBlock="lg"
                    innerClassName="lg:py-32"
                >
                    <div className="flex flex-col gap-12">
                        {systemHeader}
                        <div className="lg:grid lg:grid-cols-12 lg:gap-16">
                            <div className="lg:col-span-6">
                                <DisclosureList
                                    triggerId={triggerId}
                                    dimensions={dimensions}
                                    activeIndex={activeIndex}
                                    onSelect={setActiveId}
                                />
                            </div>
                            {morphable ? null : (
                                <div className="mt-12 lg:col-span-6 lg:mt-0">
                                    <SystemRing
                                        name={systemName as string}
                                        count={dimensions.length}
                                        activeIndex={activeIndex}
                                        activeLabel={caption}
                                        className="mx-auto w-full max-w-md lg:sticky lg:top-32"
                                    />
                                </div>
                            )}
                        </div>
                        {morphable ? (
                            // Mobile: the finished dial under the list (same geometry).
                            <div className="lg:hidden">
                                <MorphFrameworkGraphic
                                    t={1}
                                    par={{x: 0, y: 0}}
                                    labels={morphLabels}
                                    activeIndex={activeIndex}
                                    hoverIndex={-1}
                                    centerLabel={centerLabel}
                                    centerSub={centerSub}
                                    caption={caption}
                                />
                            </div>
                        ) : null}
                    </div>
                </PageDielineSection>
                </div>
            </div>
        </section>
    );
}
