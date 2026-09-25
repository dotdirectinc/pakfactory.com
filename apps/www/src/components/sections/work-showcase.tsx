'use client';

import {useCallback, useEffect, useRef, useState, type CSSProperties} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {ArrowUpRight, ChevronLeft, ChevronRight} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {
    PageDielineSection,
    pageDielineContentClass,
} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';
import {SectionHeading} from '@/components/ui/section-heading';
import {useScrollScrub, SCRUB_VH} from '@/lib/ui/use-scroll-scrub';

export type WorkShowcaseCard = {
    id: string;
    title: string;
    /** Brand / client line (case cards) or finish line (work cards). */
    description?: string;
    image: {src: string; alt: string};
    href: string;
};

export type WorkShowcaseContent = {
    eyebrow?: string;
    heading: string;
    intro?: string;
    align?: 'left' | 'center';
    /** Case studies — the large stepping row. */
    cases: WorkShowcaseCard[];
    /** Other work — the small gliding row under it (optional). */
    works: WorkShowcaseCard[];
};

// ── Reveal geometry (POC `WorkShowcaseCaseStudies` parity) ───────────────────
// Motion maths, not styling: these numbers feed the per-frame resize and must
// agree with the classes below (GAP = gap-4, INSET = the page gutter at md+).

/** Case card height at rest: phone (52vw) · desktop cap · both rows fit the window. */
const REST_CASE = 'min(52vw, 520px, calc((100vh - 64px) / 1.5))';
const restCasePx = () =>
    Math.min(window.innerWidth * 0.52, 520, (window.innerHeight - 64) / 1.5);
/** Case row centre once settled — centres the PAIR of rows in the window
 *  (or the case row alone when there is no work row). */
const restAnchor = (hasWorks: boolean) =>
    hasWorks ? 'calc(50vh - var(--case-h) * 0.25 - 8px)' : '50vh';
const INSET = 32;
const GAP = 16;
/** One full copy of the list either side, so stepping past an end lands on a real card. */
const COPIES_EITHER_SIDE = 1;

const DWELL_MS = 4000;
/** Hover slows the rows rather than stopping them. */
const DWELL_HOVER_MS = 10000;
const GLIDE_PX_PER_SEC = 88;
const GLIDE_HOVER_FACTOR = 0.25;
const EASE_MS = 700;
const EASE = `transform ${EASE_MS}ms cubic-bezier(0.32, 0.08, 0.24, 1)`;

const reducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Resize (never scale) the case row from a large inset opening to its resting
 * size, re-centred on whichever card is in the middle — gutters and radii stay
 * the same pixels throughout because nothing is multiplied.
 */
function revealByResize(
    t: number,
    host: DOMRect,
    refs: {
        win: HTMLElement | null;
        track: HTMLElement | null;
        centred: HTMLElement | null | undefined;
        settle: () => void;
        hasWorks: boolean;
    },
) {
    const {win, track, centred, settle, hasWorks} = refs;
    if (!win || !track || !centred) return;
    if (t >= 1) {
        win.style.setProperty('--case-h', REST_CASE);
        win.style.setProperty('--case-anchor', restAnchor(hasWorks));
        track.style.transition = EASE;
    } else {
        const start = Math.min(((host.width - INSET * 2) * 9) / 16, host.height - INSET * 2);
        const row = start + (restCasePx() - start) * t;
        track.style.transition = 'none';
        win.style.setProperty('--case-h', `${row}px`);
        const open = host.height / 2;
        const settled = hasWorks
            ? (host.height - (row * 1.5 + GAP)) / 2 + row / 2
            : host.height / 2;
        win.style.setProperty('--case-anchor', `${open + (settled - open) * t}px`);
    }
    const x = host.width / 2 - (centred.offsetLeft + centred.offsetWidth / 2);
    track.style.transform = `translate3d(${x}px, 0, 0)`;
    if (t >= 1) settle();
}

function CaseCard({
    card,
    primary,
    revealed,
    dimmed,
}: {
    card: WorkShowcaseCard;
    primary: boolean;
    revealed: boolean;
    dimmed: boolean;
}) {
    return (
        <Link
            href={card.href}
            tabIndex={primary && revealed ? undefined : -1}
            style={{height: 'var(--case-h)', width: 'calc(var(--case-h) * 16 / 9)'}}
            className={cn(
                'group relative flex shrink-0 flex-col justify-end overflow-hidden rounded-xl bg-muted transition-opacity duration-500 ease-out focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground motion-reduce:transition-none',
                dimmed ? 'opacity-35' : 'opacity-100',
            )}
        >
            <Image
                src={card.image.src}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 640px) 90vw, 920px"
            />
            <span
                aria-hidden
                className={cn(
                    'absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/25 via-45% to-foreground/10 transition-opacity duration-500 ease-out motion-reduce:transition-none',
                    revealed ? 'opacity-100' : 'opacity-0',
                )}
            />
            {/* Copy waits for the reveal to land — no type sliding at a size it
                was never set at. The pill is always visible once landed (touch
                has no hover to discover the link with). */}
            <span
                className={cn(
                    'relative flex flex-col items-start gap-2 p-6 pt-12 transition-opacity duration-500 ease-out motion-reduce:transition-none',
                    revealed ? 'opacity-100' : 'opacity-0',
                )}
            >
                {card.description ? (
                    <span className="text-xs font-semibold uppercase tracking-widest text-background/85">
                        {card.description}
                    </span>
                ) : null}
                <span className="text-lg font-medium leading-snug text-background sm:text-xl">
                    {card.title}
                </span>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-background/15 px-3 py-1 text-xs font-medium text-background backdrop-blur-sm transition-colors duration-300 group-hover:bg-background group-hover:text-foreground motion-reduce:transition-none">
                    View case study
                    <Icon icon={ArrowUpRight} />
                </span>
            </span>
        </Link>
    );
}

function WorkCard({card, primary}: {card: WorkShowcaseCard; primary: boolean}) {
    return (
        <Link
            href={card.href}
            tabIndex={primary ? undefined : -1}
            style={{height: 'calc(var(--case-h) * 0.5)', width: 'calc(var(--case-h) * 0.5 * 4 / 3)'}}
            className="group relative block overflow-hidden rounded-xl bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
            <Image
                src={card.image.src}
                alt={primary ? card.image.alt : ''}
                fill
                className="object-cover"
                sizes="360px"
            />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-foreground/80 to-transparent p-3 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
                <span className="text-xs leading-4 text-background">
                    <span className="font-medium">{card.title}</span>
                    {card.description ? (
                        <span className="text-background/75"> · {card.description}</span>
                    ) : null}
                </span>
            </span>
        </Link>
    );
}

/**
 * Work showcase — case-study led (POC `WorkShowcaseCaseStudies` parity).
 * Renders Studio `inspirationsGrid` on expertise stage pages. Props-only.
 *
 * Opens on one case study held large inside the page gutter, then — pinned
 * while you scroll one viewport — resolves into two rows: case studies you can
 * read (stepping every 4s, 10s under the pointer) and the work under them
 * (gliding 88px/s, a quarter speed under the pointer). Both slow, never stop.
 * Off below 640px and under reduced motion: both rows sit at rest, no runway.
 */
export function WorkShowcase({
    content,
    id = 'work',
}: {
    content: WorkShowcaseContent;
    id?: string;
}) {
    const {eyebrow, heading, intro, align, cases, works} = content;
    const [index, setIndex] = useState(0);
    const [eased, setEased] = useState(true);
    const [offset, setOffset] = useState<{
        base: number;
        stride: number;
        viewport: number;
    } | null>(null);
    const [hovered, setHovered] = useState<'cases' | 'works' | null>(null);

    const runwayRef = useRef<HTMLDivElement>(null);
    const windowRef = useRef<HTMLDivElement>(null);
    const caseTrackRef = useRef<HTMLUListElement>(null);
    const caseRefs = useRef<(HTMLLIElement | null)[]>([]);
    const glideRef = useRef<HTMLUListElement>(null);
    const hoverRef = useRef(hovered);
    hoverRef.current = hovered;

    const units = cases.length;
    const lead = units * COPIES_EITHER_SIDE;
    const caseTrack = Array.from(
        {length: units * (1 + COPIES_EITHER_SIDE * 2)},
        (_, i) => cases[(((i - lead) % units) + units) % units] as WorkShowcaseCard,
    );

    const readOffset = useCallback(() => {
        const el = caseRefs.current[lead];
        const parent = caseTrackRef.current?.parentElement;
        if (!el || !parent) return null;
        return {
            base: el.offsetLeft + el.offsetWidth / 2,
            stride: (caseRefs.current[lead + 1]?.offsetLeft ?? el.offsetLeft) - el.offsetLeft,
            viewport: parent.clientWidth,
        };
    }, [lead]);

    const paintOwnsRow = useRef(false);
    const measure = useCallback(() => {
        if (paintOwnsRow.current) return;
        const next = readOffset();
        if (next) setOffset(next);
    }, [readOffset]);

    const paint = useCallback(
        (t: number, host: DOMRect) =>
            revealByResize(t, host, {
                win: windowRef.current,
                track: caseTrackRef.current,
                centred: caseRefs.current[lead + index],
                settle: () => {
                    const next = readOffset();
                    if (next) setOffset(next);
                },
                hasWorks: works.length > 0,
            }),
        [index, lead, readOffset, works.length],
    );
    const {landed, active: scrubbing} = useScrollScrub({
        runwayRef,
        windowRef,
        enabled: units > 0,
        paint,
    });
    paintOwnsRow.current = scrubbing && !landed;

    useEffect(() => {
        measure();
        const first = caseRefs.current[lead];
        const observer = new ResizeObserver(measure);
        if (first) observer.observe(first);
        window.addEventListener('resize', measure);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [measure, lead]);

    // A stationary cursor never fires leave while the page scrolls under it.
    useEffect(() => {
        if (hovered === null) return undefined;
        const clear = () => setHovered(null);
        window.addEventListener('scroll', clear, {passive: true});
        return () => window.removeEventListener('scroll', clear);
    }, [hovered]);

    // Case row: step on a clock (slower under the pointer).
    useEffect(() => {
        if (!landed || !offset || units < 2 || reducedMotion()) return undefined;
        const timer = window.setTimeout(
            () => setIndex((i) => i + 1),
            hovered === 'cases' ? DWELL_HOVER_MS : DWELL_MS,
        );
        return () => window.clearTimeout(timer);
    }, [landed, offset, hovered, index, units]);

    // Past either end: after the ease, jump silently back into the real list.
    useEffect(() => {
        if (units === 0 || (index >= 0 && index < units)) return undefined;
        const timer = window.setTimeout(() => {
            setEased(false);
            setIndex(((index % units) + units) % units);
        }, EASE_MS);
        return () => window.clearTimeout(timer);
    }, [index, units]);
    useEffect(() => {
        if (eased) return undefined;
        const frame = requestAnimationFrame(() => setEased(true));
        return () => cancelAnimationFrame(frame);
    }, [eased]);

    // Work row: rAF glide — speed eases toward its target so it never jumps.
    useEffect(() => {
        if (!landed || works.length === 0 || reducedMotion()) return undefined;
        const ul = glideRef.current;
        if (!ul) return undefined;
        let raf = 0;
        let last = 0;
        let travelled = 0;
        let speed = GLIDE_PX_PER_SEC;
        const tick = (now: number) => {
            const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
            last = now;
            const target =
                hoverRef.current === 'works'
                    ? GLIDE_PX_PER_SEC * GLIDE_HOVER_FACTOR
                    : GLIDE_PX_PER_SEC;
            speed += (target - speed) * Math.min(1, dt * 6);
            const copy = ul.scrollWidth / 2;
            travelled = copy ? (travelled + speed * dt) % copy : 0;
            ul.style.transform = `translate3d(${-travelled}px, 0, 0)`;
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [landed, works.length]);

    const go = (delta: number) => {
        setEased(true);
        setIndex((i) => i + delta);
    };

    if (units === 0) return null;
    const x = offset ? offset.viewport / 2 - (offset.base + index * offset.stride) : 0;
    const headingId = `${id}-heading`;

    return (
        <section id={id} aria-labelledby={headingId} className="scroll-mt-32">
            <PageDielineSection as="div" paddingBlock="lg" innerClassName="pb-0 sm:pb-0">
                <SectionHeading
                    eyebrow={eyebrow}
                    title={<span id={headingId}>{heading}</span>}
                    description={intro}
                    descriptionClassName="text-base leading-7"
                    align={align}
                />
            </PageDielineSection>

            {/* Height is reserved only while the reveal runs — without it, two
                viewports of held-open page would just be a hole. */}
            <div
                ref={runwayRef}
                className={cn('relative mt-12', !scrubbing && 'mb-16 sm:mb-24')}
                style={scrubbing ? {height: `calc(100vh + ${SCRUB_VH}vh)`} : undefined}
            >
                <div
                    ref={windowRef}
                    className={cn('relative overflow-hidden', scrubbing ? 'sticky top-0 h-screen' : 'py-4')}
                    style={
                        {
                            '--case-h': REST_CASE,
                            '--case-anchor': restAnchor(works.length > 0),
                        } as CSSProperties
                    }
                >
                    <div
                        className={cn('inset-x-0', scrubbing ? 'absolute -translate-y-1/2' : 'relative')}
                        style={scrubbing ? {top: 'var(--case-anchor)'} : undefined}
                        onPointerEnter={() => setHovered('cases')}
                        onPointerLeave={() => setHovered(null)}
                    >
                        <ul
                            ref={caseTrackRef}
                            aria-label="Case studies"
                            className="flex w-max list-none gap-4"
                            style={{
                                transform: `translate3d(${x}px, 0, 0)`,
                                transition: eased ? EASE : 'none',
                            }}
                        >
                            {caseTrack.map((card, i) => {
                                const primary = i >= lead && i < lead + units;
                                return (
                                    <li
                                        key={`${i}-${card.id}`}
                                        ref={(node) => {
                                            caseRefs.current[i] = node;
                                        }}
                                        aria-hidden={primary ? undefined : true}
                                        className="shrink-0"
                                    >
                                        <CaseCard
                                            card={card}
                                            primary={primary}
                                            revealed={landed}
                                            dimmed={i !== lead + index}
                                        />
                                    </li>
                                );
                            })}
                        </ul>
                        {/* Arrows sit on the row they drive, inside the dieline column. */}
                        <div className={pageDielineContentClass('pointer-events-none absolute inset-0')}>
                            <div className="relative h-full w-full">
                                {(
                                    [
                                        {dir: -1, label: 'Previous case study', side: 'left-2', glyph: ChevronLeft},
                                        {dir: 1, label: 'Next case study', side: 'right-2', glyph: ChevronRight},
                                    ] as const
                                ).map(({dir, label, side, glyph}) => (
                                    <div
                                        key={label}
                                        className={cn(
                                            'absolute top-4 z-10 transition-opacity duration-300 motion-reduce:transition-none sm:top-1/2 sm:-translate-y-1/2',
                                            side,
                                            landed ? 'opacity-100' : 'pointer-events-none opacity-0',
                                        )}
                                    >
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="icon-lg"
                                            onClick={() => go(dir)}
                                            aria-label={label}
                                            tabIndex={landed ? undefined : -1}
                                            className="pointer-events-auto rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
                                        >
                                            <Icon icon={glyph} size="md" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {works.length > 0 ? (
                        <div
                            className={cn('inset-x-0 overflow-hidden', scrubbing ? 'absolute' : 'relative mt-4')}
                            style={
                                scrubbing
                                    ? {top: `calc(var(--case-anchor) + var(--case-h) / 2 + ${GAP}px)`}
                                    : undefined
                            }
                            onPointerEnter={() => setHovered('works')}
                            onPointerLeave={() => setHovered(null)}
                        >
                            <ul ref={glideRef} aria-label="Our work" className="flex w-max list-none">
                                {[0, 1].map((copy) =>
                                    works.map((card) => (
                                        <li
                                            key={`${copy}-${card.id}`}
                                            aria-hidden={copy === 0 ? undefined : true}
                                            className="mr-4 shrink-0"
                                        >
                                            <WorkCard card={card} primary={copy === 0} />
                                        </li>
                                    )),
                                )}
                            </ul>
                        </div>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
