'use client';

import {
    Suspense,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
} from 'react';
import Link from 'next/link';
import {ArrowUpRight, Pause, Play} from 'lucide-react';
import {Badge} from '@pakfactory/ui/components/badge';
import {Button} from '@pakfactory/ui/components/button';
import {
    PageDielineSection,
    pageDielineContentClass,
    pageDielineOuterClass,
} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {PageHeadingContent} from '@/components/common/page-heading-section';
import {buildFinderHeadingTitle} from '@/components/ui/hero-finder-shared';
import {CoverVideo} from '@/components/ui/cover-video';
import {Icon} from '@/components/ui/icon';
import {SanityImage} from '@/components/ui/sanity-image';
import {
    FINDER_INDUSTRY_SENTINEL_SLUG,
    FINDER_LINE_SENTINEL_SLUG,
    isFinderIndustrySentinel,
    isFinderLineSentinel,
    rankIndustriesWithAllFirst,
    withFinderSentinels,
} from '@/lib/sections/hero-finder-match';
import {
    buildFinderFullscreenSpecificSlides,
    type FinderFullscreenSlide,
} from '@/lib/sections/hero-finder-fullscreen-match';
import type {HeroFinderFullscreenContent} from '@/lib/sections/map-hero';
import {usePrefersReducedMotion} from '@/lib/ui/use-prefers-reduced-motion';
import {useQueryParamState} from '@/lib/ui/use-query-param-state';

/** Live nav height from `:root` (hoisted by SiteNavRequestSlot); fallback 4.5rem. */
const FRAME_H = 'h-[calc(100dvh-var(--site-nav-offset,4.5rem))]';
const CARD_W = 280;
/** Min height so kind labels center on the dock mid-line. */
const DOCK_MIN_H = 220;
/** Kind spots left of the dock (spots 1–3); dock is spot 4. */
const PREV_VISIBLE = 3;
/** Min |dx| / cellW to commit a slide on release. */
const DRAG_COMMIT_RATIO = 0.25;
/** Movement before a gesture counts as a drag (not a click). */
const DRAG_CLICK_PX = 8;
/** px/ms — fling commits even below distance threshold. */
const DRAG_VELOCITY = 0.45;
/** Auto-advance interval (hero spotlight parity). */
const AUTOPLAY_MS = 7000;

type HeroFinderFullscreenPanelProps = {
    content: HeroFinderFullscreenContent;
    titleId: string;
    actions?: ReactNode;
};

export function HeroFinderFullscreenPanel(
    props: HeroFinderFullscreenPanelProps,
) {
    return (
        <Suspense fallback={<HeroFinderFullscreenLocal {...props} />}>
            <HeroFinderFullscreenSynced {...props} />
        </Suspense>
    );
}

function useFinderOptions(content: HeroFinderFullscreenContent) {
    return useMemo(
        () => withFinderSentinels(content.lines, content.industries),
        [content.lines, content.industries],
    );
}

function HeroFinderFullscreenSynced(props: HeroFinderFullscreenPanelProps) {
    const {lines, industries} = useFinderOptions(props.content);
    const paramDefs = useMemo(
        () => ({
            line: {param: 'line', defaultValue: FINDER_LINE_SENTINEL_SLUG},
            industry: {
                param: 'industry',
                defaultValue: FINDER_INDUSTRY_SENTINEL_SLUG,
            },
        }),
        [],
    );
    const {values, setValue} = useQueryParamState({params: paramDefs});
    const line = resolveBySlug(lines, values.line) ?? lines[0];
    const industry =
        resolveBySlug(industries, values.industry) ?? industries[0];

    return (
        <HeroFinderFullscreenChrome
            {...props}
            lines={lines}
            industries={industries}
            line={line}
            industry={industry}
            onLineChange={(slug) => setValue('line', slug)}
            onIndustryChange={(slug) => setValue('industry', slug)}
        />
    );
}

function HeroFinderFullscreenLocal(props: HeroFinderFullscreenPanelProps) {
    const {lines, industries} = useFinderOptions(props.content);
    const [lineSlug, setLineSlug] = useState(FINDER_LINE_SENTINEL_SLUG);
    const [industrySlug, setIndustrySlug] = useState(
        FINDER_INDUSTRY_SENTINEL_SLUG,
    );
    const line = resolveBySlug(lines, lineSlug) ?? lines[0];
    const industry = resolveBySlug(industries, industrySlug) ?? industries[0];

    return (
        <HeroFinderFullscreenChrome
            {...props}
            lines={lines}
            industries={industries}
            line={line}
            industry={industry}
            onLineChange={setLineSlug}
            onIndustryChange={setIndustrySlug}
        />
    );
}

function resolveBySlug<T extends {id: string; slug: string}>(
    items: T[],
    slug: string | undefined,
): T | undefined {
    if (!slug) return undefined;
    return (
        items.find((item) => item.slug === slug) ??
        items.find((item) => item.id === slug)
    );
}

function HeroFinderFullscreenChrome({
    content,
    titleId,
    actions,
    lines,
    industries,
    line,
    industry,
    onLineChange,
    onIndustryChange,
}: HeroFinderFullscreenPanelProps & {
    lines: HeroFinderFullscreenContent['lines'];
    industries: HeroFinderFullscreenContent['industries'];
    line?: HeroFinderFullscreenContent['lines'][number];
    industry?: HeroFinderFullscreenContent['industries'][number];
    onLineChange: (slug: string) => void;
    onIndustryChange: (slug: string) => void;
}) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [visualIndex, setVisualIndex] = useState(0);
    const [railWidth, setRailWidth] = useState(0);
    const [dockLeft, setDockLeft] = useState(0);
    const [skipTransition, setSkipTransition] = useState(false);
    const [dragDx, setDragDx] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [paused, setPaused] = useState(false);
    const railRef = useRef<HTMLDivElement>(null);
    const dockSlotRef = useRef<HTMLDivElement>(null);
    const skipTransitionRef = useRef(false);
    const suppressClickRef = useRef(false);
    const dragRef = useRef({
        pointerId: null as number | null,
        startX: 0,
        startY: 0,
        lastX: 0,
        lastT: 0,
        velocity: 0,
        moved: false,
        axis: null as 'x' | 'y' | null,
    });
    const reduceMotion = usePrefersReducedMotion();

    const curatedLines = useMemo(
        () => lines.filter((item) => !isFinderLineSentinel(item)),
        [lines],
    );
    const rankedIndustries = useMemo(
        () =>
            line ? rankIndustriesWithAllFirst(industries, line.id) : industries,
        [industries, line],
    );

    const slides: FinderFullscreenSlide[] = useMemo(() => {
        if (!line || !industry) return [];
        const isGeneral =
            isFinderLineSentinel(line) && isFinderIndustrySentinel(industry);
        return isGeneral
            ? content.generalSlides
            : buildFinderFullscreenSpecificSlides({
                  line,
                  industry,
                  curatedLines,
              });
    }, [line, industry, content.generalSlides, curatedLines]);

    const n = slides.length;
    const loop = n > 2;
    const safeIndex = n === 0 ? 0 : Math.min(activeIndex, n - 1);
    const active = slides[safeIndex];

    const trackSlides = useMemo(() => {
        if (n === 0) return [];
        if (!loop) {
            return slides.map((slide, index) => ({
                slide,
                trackIndex: index,
                key: slide.id,
            }));
        }
        return [0, 1, 2].flatMap((copy) =>
            slides.map((slide, index) => ({
                slide,
                trackIndex: copy * n + index,
                key: `${copy}-${slide.id}`,
            })),
        );
    }, [slides, n, loop]);

    /** Kind band ends at dock left (max-width column); fallback until measured. */
    const kindBandWidth =
        dockLeft > 0 ? dockLeft : railWidth > CARD_W ? railWidth - CARD_W : 0;
    const cellW = kindBandWidth > 0 ? kindBandWidth / PREV_VISIBLE : CARD_W;

    /** Dock-aligned cell: middle copy when looping, else linear active. */
    const dockCellIndex = loop ? visualIndex : safeIndex;
    const baseTranslateX =
        kindBandWidth > 0 ? kindBandWidth - dockCellIndex * cellW : 0;
    const trackTranslateX = baseTranslateX + (reduceMotion ? 0 : dragDx);

    const deckKey = `${line?.slug ?? ''}:${industry?.slug ?? ''}:${slides.map((s) => s.id).join(',')}`;

    useLayoutEffect(() => {
        setActiveIndex(0);
        setVisualIndex(loop ? n : 0);
        skipTransitionRef.current = true;
        setSkipTransition(true);
        setDragDx(0);
        setDragging(false);
    }, [deckKey, loop, n]);

    useLayoutEffect(() => {
        if (!skipTransition) return;
        const id = requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                skipTransitionRef.current = false;
                setSkipTransition(false);
            });
        });
        return () => cancelAnimationFrame(id);
    }, [skipTransition, visualIndex]);

    /** No transitionend when reduced motion — snap clone window immediately. */
    useLayoutEffect(() => {
        if (!loop || n === 0 || !reduceMotion) return;
        if (visualIndex >= n && visualIndex < 2 * n) return;
        skipTransitionRef.current = true;
        setSkipTransition(true);
        setVisualIndex((((visualIndex % n) + n) % n) + n);
    }, [visualIndex, loop, n, reduceMotion]);

    useLayoutEffect(() => {
        const rail = railRef.current;
        const dock = dockSlotRef.current;
        if (!rail) return;

        const sync = () => {
            setRailWidth(rail.clientWidth);
            if (!dock) {
                setDockLeft(0);
                return;
            }
            const railBox = rail.getBoundingClientRect();
            const dockBox = dock.getBoundingClientRect();
            setDockLeft(Math.max(0, dockBox.left - railBox.left));
        };

        sync();
        const observer = new ResizeObserver(sync);
        observer.observe(rail);
        if (dock) observer.observe(dock);
        window.addEventListener('resize', sync);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', sync);
        };
    }, []);

    const go = (delta: number) => {
        if (n === 0) return;
        if (loop) {
            setVisualIndex((v) => v + delta);
            setActiveIndex((a) => (((a + delta) % n) + n) % n);
            return;
        }
        setActiveIndex((a) => Math.max(0, Math.min(n - 1, a + delta)));
    };
    const goRef = useRef(go);
    goRef.current = go;

    const autoplay =
        n > 1 && !reduceMotion && !paused && !dragging && !skipTransition;
    useEffect(() => {
        if (!autoplay) return undefined;
        const timer = window.setTimeout(() => goRef.current(1), AUTOPLAY_MS);
        return () => window.clearTimeout(timer);
    }, [autoplay, safeIndex, visualIndex]);

    const selectTrackCell = (trackIndex: number) => {
        if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
        }
        if (n === 0) return;
        if (trackIndex === dockCellIndex) return;
        if (loop) {
            setVisualIndex(trackIndex);
            setActiveIndex(((trackIndex % n) + n) % n);
            return;
        }
        setActiveIndex(trackIndex);
    };

    const recenterIfNeeded = () => {
        if (!loop || n === 0) return;
        setVisualIndex((v) => {
            if (v >= n && v < 2 * n) return v;
            skipTransitionRef.current = true;
            setSkipTransition(true);
            return (((v % n) + n) % n) + n;
        });
    };

    const canPrev = loop || safeIndex > 0;
    const canNext = loop || safeIndex < n - 1;
    const animateTrack = !reduceMotion && !skipTransition && !dragging;

    const resetDrag = () => {
        dragRef.current = {
            pointerId: null,
            startX: 0,
            startY: 0,
            lastX: 0,
            lastT: 0,
            velocity: 0,
            moved: false,
            axis: null,
        };
        setDragDx(0);
        setDragging(false);
    };

    const endDrag = (
        event: ReactPointerEvent<HTMLDivElement>,
        commit: boolean,
    ) => {
        const drag = dragRef.current;
        if (drag.pointerId !== event.pointerId) return;
        try {
            event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
            /* already released */
        }

        const dx = event.clientX - drag.startX;
        if (drag.moved && drag.axis === 'x') suppressClickRef.current = true;

        if (commit && drag.moved && drag.axis === 'x') {
            const threshold = cellW * DRAG_COMMIT_RATIO;
            const fling = Math.abs(drag.velocity) >= DRAG_VELOCITY;
            const farEnough = Math.abs(dx) >= threshold;
            if (farEnough || fling) {
                const toNext = dx < 0 || drag.velocity < -DRAG_VELOCITY;
                if (toNext && canNext) go(1);
                else if (!toNext && canPrev) go(-1);
            }
        }

        resetDrag();
    };

    const onRailPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        if (n === 0) return;
        const target = event.target as Node;
        if (dockSlotRef.current?.contains(target)) return;

        // Record only — capture/drag starts after horizontal threshold (keeps click transitions).
        const now = performance.now();
        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            lastX: event.clientX,
            lastT: now,
            velocity: 0,
            moved: false,
            axis: null,
        };
    };

    const onRailPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (drag.pointerId !== event.pointerId) return;

        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (
            drag.axis === null &&
            (absX > DRAG_CLICK_PX || absY > DRAG_CLICK_PX)
        ) {
            drag.axis = absY > absX ? 'y' : 'x';
            if (drag.axis === 'y') {
                resetDrag();
                return;
            }
            drag.moved = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
        }

        if (drag.axis !== 'x') return;

        drag.moved = true;
        const now = performance.now();
        const dt = now - drag.lastT;
        if (dt > 0) {
            drag.velocity = (event.clientX - drag.lastX) / dt;
        }
        drag.lastX = event.clientX;
        drag.lastT = now;

        if (!reduceMotion) setDragDx(dx);
    };

    const title =
        line && industry
            ? buildFinderHeadingTitle({
                  headingLead: content.headingLead,
                  headingJoin: content.headingJoin,
                  headingTrail: content.headingTrail,
                  line,
                  industry,
                  lineOptions: lines.map((item) => ({
                      id: item.slug,
                      title: item.title,
                  })),
                  industryOptions: rankedIndustries.map((item) => ({
                      id: item.slug,
                      title: item.title,
                  })),
                  onLineChange,
                  onIndustryChange,
              })
            : null;

    if (!line || !industry || !title) return null;

    return (
        <div
            className={cn(
                'relative isolate flex flex-col overflow-hidden border-b border-dashed border-border',
                FRAME_H,
            )}
        >
            {/* Background crossfade stack */}
            <div className="absolute inset-0 bg-muted" aria-hidden>
                {slides.map((slide, index) => {
                    const current = index === safeIndex;
                    const hasVideo = Boolean(slide.videoSrc?.trim());
                    const hasImage = Boolean(slide.image?.src);
                    if (!hasVideo && !hasImage) return null;
                    return (
                        <div
                            key={slide.id}
                            className={cn(
                                'absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none',
                                current
                                    ? 'opacity-100'
                                    : 'pointer-events-none opacity-0',
                            )}
                        >
                            {hasImage ? (
                                <SanityImage
                                    src={slide.image!.src}
                                    alt=""
                                    fill
                                    priority={index === 0}
                                    sizes="100vw"
                                    className="object-cover"
                                />
                            ) : null}
                            {hasVideo ? (
                                <CoverVideo
                                    src={slide.videoSrc!}
                                    poster={slide.image?.src}
                                    active={current}
                                />
                            ) : null}
                        </div>
                    );
                })}
                <div className="absolute inset-0 bg-black/30" />
            </div>

            {/* Full-frame vertical dieline guides (above BG, below content) */}
            <div
                aria-hidden
                className={cn(
                    'pointer-events-none absolute inset-y-0 z-[5] w-full',
                    pageDielineOuterClass(),
                )}
            >
                <div className="mx-auto h-full w-full max-w-[var(--layout-max)] border-x border-dashed border-border" />
            </div>

            <PageDielineSection
                as="div"
                borderBottom={false}
                borderX={false}
                paddingBlock="md"
                className="relative z-10 min-h-0 flex-1"
                innerClassName="relative"
            >
                <PageHeadingContent
                    eyebrow={content.eyebrow}
                    title={title}
                    titleId={titleId}
                    description={content.intro}
                    settle
                    titleClassName="max-w-5xl"
                >
                    {actions}
                </PageHeadingContent>
            </PageDielineSection>

            {/* Full-bleed kinds; dock + nav inside dieline max-width. */}
            {slides.length > 0 ? (
                <div
                    className="relative z-20 shrink-0 pb-10"
                    aria-live="polite"
                >
                    <div className="flex flex-col gap-8">
                        <div
                            ref={railRef}
                            className={cn(
                                'relative touch-pan-y overflow-hidden',
                                dragging ? 'cursor-grabbing' : 'cursor-grab',
                            )}
                            style={{minHeight: DOCK_MIN_H}}
                            onPointerDown={onRailPointerDown}
                            onPointerMove={onRailPointerMove}
                            onPointerUp={(event) => endDrag(event, true)}
                            onPointerCancel={(event) => endDrag(event, false)}
                        >
                            {/* Layer 1 — kind track bleeds edge to edge */}
                            <div
                                className={cn(
                                    'absolute inset-y-0 left-0 z-20 flex items-center',
                                    animateTrack &&
                                        'transition-transform duration-500 ease-out',
                                )}
                                style={{
                                    transform: `translateX(${trackTranslateX}px)`,
                                }}
                                onTransitionEnd={(event) => {
                                    if (event.propertyName !== 'transform')
                                        return;
                                    if (event.target !== event.currentTarget)
                                        return;
                                    recenterIfNeeded();
                                }}
                            >
                                {trackSlides.map(({slide, trackIndex, key}) => {
                                    const underDock =
                                        trackIndex === dockCellIndex;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() =>
                                                selectTrackCell(trackIndex)
                                            }
                                            aria-current={
                                                underDock ? 'true' : undefined
                                            }
                                            tabIndex={
                                                underDock ? -1 : undefined
                                            }
                                            className={cn(
                                                'shrink-0 cursor-inherit truncate px-2 text-left text-2xl font-semibold tracking-tight text-foreground/55 transition-colors hover:text-foreground/80 motion-reduce:transition-none',
                                                underDock &&
                                                    'pointer-events-none opacity-0',
                                            )}
                                            style={{width: cellW}}
                                        >
                                            {slide.kindLabel}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Layer 2 — dock contained in max-width column */}
                            <div
                                className={cn(
                                    'pointer-events-none absolute inset-0 z-30',
                                    pageDielineOuterClass(),
                                )}
                            >
                                <div
                                    className={cn(
                                        'relative flex h-full items-center',
                                        pageDielineContentClass(),
                                    )}
                                >
                                    <div
                                        ref={dockSlotRef}
                                        className="pointer-events-auto ml-auto"
                                        style={{width: CARD_W}}
                                    >
                                        {active ? (
                                            <div
                                                key={active.id}
                                                className="animate-in fade-in fill-mode-both duration-300 motion-reduce:animate-none"
                                            >
                                                <DetailCard slide={active} />
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={pageDielineOuterClass()}>
                            <div
                                className={cn(
                                    'flex flex-wrap items-center justify-end gap-4',
                                    pageDielineContentClass(),
                                )}
                            >
                                {n > 1 && !reduceMotion ? (
                                    <Button
                                        type="button"
                                        variant="default"
                                        size="icon"
                                        className="rounded-full bg-foreground text-background hover:bg-foreground/90"
                                        aria-pressed={paused}
                                        aria-label={
                                            paused
                                                ? 'Play results'
                                                : 'Pause results'
                                        }
                                        onClick={() =>
                                            setPaused((value) => !value)
                                        }
                                    >
                                        {paused ? (
                                            <Play
                                                className="size-4"
                                                fill="currentColor"
                                                aria-hidden
                                            />
                                        ) : (
                                            <Pause
                                                className="size-4"
                                                fill="currentColor"
                                                aria-hidden
                                            />
                                        )}
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function DetailCard({slide}: {slide: FinderFullscreenSlide}) {
    return (
        <div
            className="flex flex-col gap-4 overflow-hidden rounded-xl bg-background p-6 text-foreground"
            style={{width: CARD_W, height: DOCK_MIN_H}}
        >
            <Badge
                variant="secondary"
                className="w-fit uppercase tracking-wider"
            >
                {slide.kindLabel}
            </Badge>
            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
                <p className="line-clamp-2 text-lg font-medium leading-snug">
                    {slide.title}
                </p>
                {slide.description ? (
                    <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {slide.description}
                    </p>
                ) : null}
            </div>
            {slide.stat || slide.link ? (
                <div className="mt-auto flex flex-wrap items-end justify-between gap-4">
                    {slide.stat ? (
                        <div className="flex flex-col gap-1">
                            <p className="text-3xl font-semibold leading-none tracking-tight tabular-nums">
                                {slide.stat.value}
                            </p>
                            {slide.stat.label ? (
                                <p className="line-clamp-2 max-w-56 text-sm text-muted-foreground">
                                    {slide.stat.label}
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                    {slide.link ? (
                        <Link
                            href={slide.link.href}
                            className="group inline-flex w-fit cursor-pointer items-center gap-2 text-sm font-medium text-primary underline underline-offset-4"
                        >
                            {slide.link.label}
                            <Icon
                                icon={ArrowUpRight}
                                className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
                            />
                        </Link>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
