'use client';

import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type DependencyList,
    type RefObject,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Plus,
    X,
} from 'lucide-react';
import {Badge} from '@pakfactory/ui/components/badge';
import {Button} from '@pakfactory/ui/components/button';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    type CarouselApi,
} from '@pakfactory/ui/components/carousel';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';

/**
 * Apple product-viewer morph rules (ported from poc-aslan SampleStageBoard):
 * 1. Radius is constant (28) in both states — never interpolate 9999 → rem.
 * 2. Box size is written in pixels from measured label + body.
 * 3. Content is laid out at open width and clipped, not reflowed mid-flight.
 * 4. Body fades in after the box has nearly arrived (~300ms delay).
 */

const RADIUS = 28;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const DURATION = 620;
/** Gutters reserved for side paddles when a mobile stage is open. */
const MOBILE_PADDLE_GUTTER = 128;

export type StagesBoardStage = {
    id: string;
    title: string;
    body?: string;
    headline?: string;
    points?: string[];
    /** Optional detail CTA shown when the stage is open. */
    link?: {label: string; href: string};
    media?: {src: string; alt: string} | null;
    mediaPlaceholder?: string;
};

export type StagesBoardProps = {
    stages: StagesBoardStage[];
    initialStageId?: string;
    /** a11y / aria-controls prefix */
    id?: string;
    className?: string;
};

type MeasureBox = {w: number; h: number};

function useMeasure(deps: DependencyList = []): [
    RefObject<HTMLElement | null>,
    MeasureBox | null,
] {
    const ref = useRef<HTMLElement | null>(null);
    const [box, setBox] = useState<MeasureBox | null>(null);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const measure = () => {
            const r = el.getBoundingClientRect();
            setBox({w: Math.ceil(r.width), h: Math.ceil(r.height)});
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- deps passed by caller
    }, deps);

    return [ref, box];
}

function navButtonClass(enabled: boolean) {
    return cn(
        'rounded-full backdrop-blur-md',
        enabled
            ? 'bg-background/80 text-foreground hover:bg-background/90 hover:text-foreground'
            : 'bg-background/40 text-muted-foreground hover:bg-background/40 hover:text-muted-foreground',
    );
}

function stageLink(stage: StagesBoardStage) {
    return stage.link &&
        stage.link.href.trim() &&
        stage.link.label.trim()
        ? stage.link
        : null;
}

function StageCaptionContent({stage}: {stage: StagesBoardStage}) {
    const link = stageLink(stage);

    return (
        <>
            {stage.headline ? (
                <p className="mb-2 text-sm font-semibold leading-6 text-foreground">
                    {stage.headline}
                </p>
            ) : null}
            {stage.body ? (
                <p className="text-sm leading-6 text-muted-foreground">
                    {stage.body}
                </p>
            ) : null}
            {link ? (
                <Button
                    asChild
                    variant="link"
                    className="mt-3 h-auto p-0 has-[>svg]:px-0"
                >
                    <Link href={link.href}>
                        {link.label}
                        <Icon icon={ChevronRight} size="sm" />
                    </Link>
                </Button>
            ) : null}
            {stage.points && stage.points.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                    {stage.points.map((point) => (
                        <Badge key={point} variant="secondary">
                            {point}
                        </Badge>
                    ))}
                </div>
            ) : null}
        </>
    );
}

/** Mobile open caption: title. above headline, then Learn more. */
function MobileOneLineCaption({stage}: {stage: StagesBoardStage}) {
    const link = stageLink(stage);
    const detail = stage.headline?.trim() || '';

    return (
        <div className="min-w-0">
            <p className="text-sm font-semibold leading-6 text-foreground">
                {stage.title}.
            </p>
            {detail ? (
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {detail}
                </p>
            ) : null}
            {link ? (
                <Button
                    asChild
                    variant="link"
                    className="mt-2 h-auto p-0 text-sm has-[>svg]:px-0"
                >
                    <Link href={link.href}>
                        {link.label}
                        <Icon icon={ChevronRight} size="sm" />
                    </Link>
                </Button>
            ) : null}
        </div>
    );
}

function MediaLayer({
    stage,
    active,
}: {
    stage: StagesBoardStage;
    active: boolean;
}) {
    const placeholder =
        stage.mediaPlaceholder?.trim() || stage.title.toUpperCase();
    const src = stage.media?.src?.trim();

    return (
        <div
            className={cn(
                'absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none',
                active ? 'opacity-100' : 'opacity-0',
            )}
            aria-hidden={!active}
        >
            {src ? (
                <Image
                    src={src}
                    alt={stage.media?.alt || stage.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1280px) 100vw, 1200px"
                    priority={active}
                />
            ) : (
                <div className="grid h-full w-full place-items-center bg-muted/60">
                    <div className="flex flex-col items-center gap-2 px-4 text-center">
                        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                            {placeholder}
                        </span>
                        <span className="text-xs leading-5 text-muted-foreground/70">
                            {stage.title}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Props-only morphing stage board — reusable across marketing sections.
 * Consumers own section chrome (eyebrow / heading / CTA).
 */
export function StagesBoard({
    stages,
    initialStageId,
    id = 'stages-board',
    className,
}: StagesBoardProps) {
    const resolvedInitial =
        initialStageId != null
            ? stages.findIndex((s) => s.id === initialStageId)
            : 0;
    const initialIndex =
        resolvedInitial === -1 ? 0 : Math.max(0, resolvedInitial);
    const [openIndex, setOpenIndex] = useState(initialIndex);
    /** Mobile: carousel of pills until one is opened (Apple product-viewer). */
    const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
    const [mobileApi, setMobileApi] = useState<CarouselApi>();
    const open = stages[openIndex] ?? stages[0];
    const mediaIndex = mobileDetailOpen ? openIndex : initialIndex;

    const [listRef, listBox] = useMeasure();
    const cardW = listBox?.w ?? null;

    const [mobileRailRef, mobileRailBox] = useMeasure([mobileDetailOpen]);
    const mobileCardW = mobileRailBox
        ? Math.max(180, mobileRailBox.w - MOBILE_PADDLE_GUTTER)
        : 240;

    useEffect(() => {
        if (!mobileApi) return;
        mobileApi.reInit({
            align: 'start',
            dragFree: true,
            containScroll: 'trimSnaps',
            watchDrag: !mobileDetailOpen,
        });
        if (mobileDetailOpen) {
            mobileApi.scrollTo(openIndex, true);
        }
    }, [mobileApi, mobileDetailOpen, openIndex]);

    if (!open || stages.length === 0) return null;

    const artId = `${id}-art`;
    const mediaStage = stages[mediaIndex] ?? open;
    const placeholder =
        mediaStage.mediaPlaceholder?.trim() ||
        mediaStage.title.toUpperCase();
    const canPrev = openIndex > 0;
    const canNext = openIndex < stages.length - 1;

    const openMobileStage = (i: number) => {
        if (mobileDetailOpen && openIndex === i) {
            setMobileDetailOpen(false);
            return;
        }
        setOpenIndex(i);
        setMobileDetailOpen(true);
    };

    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-2xl bg-background',
                className,
            )}
        >
            <div className="relative aspect-[3/4] sm:aspect-[4/5] lg:aspect-[16/9]">
                {stages.map((stage, i) => (
                    <MediaLayer
                        key={stage.id}
                        stage={stage}
                        active={i === mediaIndex}
                    />
                ))}

                {/* Mobile — Embla pill carousel + upward morph */}
                <div className="absolute inset-0 lg:hidden">
                    {mobileDetailOpen ? (
                        <>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-lg"
                                onClick={() => setMobileDetailOpen(false)}
                                className="pointer-events-auto absolute right-4 top-4 z-20 rounded-full bg-background/80 shadow-[0_0_0_0.5px_rgba(0,0,0,0.11)_inset] backdrop-blur-md hover:bg-background/90"
                                aria-label="Close stage details"
                            >
                                <Icon icon={X} size="sm" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-lg"
                                onClick={() => setOpenIndex((i) => i - 1)}
                                disabled={!canPrev}
                                className={cn(
                                    'pointer-events-auto absolute bottom-8 left-2 z-20',
                                    navButtonClass(canPrev),
                                )}
                                aria-label="Previous stage"
                            >
                                <Icon icon={ChevronLeft} size="sm" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-lg"
                                onClick={() => setOpenIndex((i) => i + 1)}
                                disabled={!canNext}
                                className={cn(
                                    'pointer-events-auto absolute bottom-8 right-2 z-20',
                                    navButtonClass(canNext),
                                )}
                                aria-label="Next stage"
                            >
                                <Icon icon={ChevronRight} size="sm" />
                            </Button>
                        </>
                    ) : null}

                    <div
                        ref={mobileRailRef as RefObject<HTMLDivElement>}
                        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 pb-4"
                    >
                        <Carousel
                            setApi={setMobileApi}
                            opts={{
                                align: 'start',
                                dragFree: true,
                                containScroll: 'trimSnaps',
                                watchDrag: !mobileDetailOpen,
                            }}
                            className="pointer-events-auto w-full"
                            aria-label="Expertise stages"
                        >
                            <CarouselContent
                                className={cn(
                                    '!-ml-0 ml-0',
                                    mobileDetailOpen && 'justify-center',
                                )}
                            >
                                {stages.map((stage, i) => {
                                    const isOpen =
                                        mobileDetailOpen && i === openIndex;
                                    return (
                                        <CarouselItem
                                            key={stage.id}
                                            className={cn(
                                                'basis-auto pl-2 first:pl-0',
                                                mobileDetailOpen &&
                                                    !isOpen &&
                                                    'pointer-events-none !w-0 !max-w-0 !basis-0 overflow-hidden opacity-0 !pl-0',
                                                isOpen &&
                                                    'flex max-w-full basis-full justify-center !pl-0',
                                            )}
                                        >
                                            <StageCard
                                                stage={stage}
                                                cardW={mobileCardW}
                                                isOpen={isOpen}
                                                layout="mobile"
                                                controls={artId}
                                                onSelect={() =>
                                                    openMobileStage(i)
                                                }
                                            />
                                        </CarouselItem>
                                    );
                                })}
                            </CarouselContent>
                        </Carousel>
                    </div>
                </div>

                {/* Desktop — vertical morph rail + up/down paddles */}
                <div className="absolute inset-0 hidden flex-row items-center gap-5 p-10 lg:flex">
                    <div className="flex shrink-0 flex-col gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-lg"
                            onClick={() => setOpenIndex((i) => i - 1)}
                            disabled={!canPrev}
                            className={navButtonClass(canPrev)}
                            aria-label="Previous"
                        >
                            <Icon icon={ChevronUp} size="sm" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-lg"
                            onClick={() => setOpenIndex((i) => i + 1)}
                            disabled={!canNext}
                            className={navButtonClass(canNext)}
                            aria-label="Next"
                        >
                            <Icon icon={ChevronDown} size="sm" />
                        </Button>
                    </div>

                    <ul
                        ref={listRef as RefObject<HTMLUListElement>}
                        className="flex max-w-md flex-1 flex-col gap-3"
                    >
                        {stages.map((stage, i) => (
                            <StageCard
                                key={stage.id}
                                stage={stage}
                                cardW={cardW}
                                isOpen={i === openIndex}
                                layout="desktop"
                                controls={artId}
                                onSelect={() => setOpenIndex(i)}
                            />
                        ))}
                    </ul>
                </div>
            </div>

            <span id={artId} className="sr-only">
                {placeholder} — {mediaStage.title}
            </span>
        </div>
    );
}

function StageCard({
    stage,
    cardW,
    isOpen,
    layout = 'desktop',
    controls,
    onSelect,
}: {
    stage: StagesBoardStage;
    cardW: number | null;
    isOpen: boolean;
    layout?: 'desktop' | 'mobile';
    controls: string;
    onSelect: () => void;
}) {
    const [labelRef, label] = useMeasure([cardW, layout]);
    const [bodyRef, body] = useMeasure([cardW, layout]);

    const sized = Boolean(label && body);
    const openW = cardW ?? label?.w;
    const isMobile = layout === 'mobile';
    const Wrapper = isMobile ? 'div' : 'li';
    /** Mobile open = caption-only card (pill chrome clips away). */
    const openH =
        isMobile && body ? body.h : label && body ? label.h + body.h : 0;
    const closedH = label?.h ?? 0;

    return (
        <Wrapper className={cn(isMobile ? 'w-auto' : 'w-full')}>
            <div
                style={{
                    borderRadius: RADIUS,
                    transitionTimingFunction: EASE,
                    transitionDuration: `${DURATION}ms`,
                    ...(sized && label && body
                        ? {
                              width: isOpen ? openW : label.w + 1,
                              height: isOpen ? openH : closedH,
                          }
                        : undefined),
                }}
                className={cn(
                    'relative overflow-hidden shadow-[0_0_0_0.5px_rgba(0,0,0,0.11)_inset,0_1px_2px_rgb(0_0_0/0.05)] transition-[width,height] motion-reduce:transition-none',
                    isMobile
                        ? 'bg-background/80 backdrop-blur-md'
                        : 'bg-background',
                )}
            >
                <div
                    className="absolute left-0 top-0 block"
                    style={cardW ? {width: cardW} : undefined}
                >
                    {isMobile ? (
                        <>
                            {/* Caption measured at open width; clipped when closed */}
                            <div
                                ref={bodyRef as RefObject<HTMLDivElement>}
                                className={cn(
                                    'px-5 py-5 transition-opacity motion-reduce:transition-none',
                                    isOpen
                                        ? 'opacity-100 delay-[300ms] duration-300'
                                        : 'pointer-events-none absolute opacity-0 duration-150',
                                )}
                                aria-hidden={!isOpen}
                            >
                                <MobileOneLineCaption stage={stage} />
                            </div>
                            {/* Pill chrome measured for closed size; clipped when open */}
                            <button
                                type="button"
                                ref={labelRef as RefObject<HTMLButtonElement>}
                                onClick={onSelect}
                                aria-expanded={isOpen}
                                aria-controls={controls}
                                className={cn(
                                    'inline-flex min-h-14 cursor-pointer items-center gap-2 whitespace-nowrap px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
                                    isOpen &&
                                        'pointer-events-none absolute opacity-0',
                                )}
                            >
                                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border">
                                    <Icon
                                        icon={Plus}
                                        size="sm"
                                        className="text-muted-foreground"
                                    />
                                </span>
                                <span className="text-sm font-medium leading-snug text-foreground">
                                    {stage.title}
                                </span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                ref={
                                    labelRef as RefObject<HTMLButtonElement>
                                }
                                onClick={onSelect}
                                aria-expanded={isOpen}
                                aria-controls={controls}
                                className="inline-flex min-h-14 cursor-pointer items-center gap-3 px-6 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground lg:whitespace-nowrap"
                            >
                                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border">
                                    <Icon
                                        icon={Plus}
                                        size="sm"
                                        className={cn(
                                            'text-muted-foreground transition-transform motion-reduce:transition-none',
                                            isOpen && 'rotate-45',
                                        )}
                                        style={{
                                            transitionTimingFunction: EASE,
                                            transitionDuration: `${DURATION}ms`,
                                        }}
                                    />
                                </span>
                                <span className="text-base font-medium leading-snug text-foreground">
                                    {stage.title}
                                </span>
                            </button>

                            <div
                                ref={bodyRef as RefObject<HTMLDivElement>}
                                className={cn(
                                    'flex gap-3 px-6 pb-6 transition-opacity motion-reduce:transition-none',
                                    isOpen
                                        ? 'opacity-100 delay-[300ms] duration-300'
                                        : 'pointer-events-none opacity-0 duration-150',
                                )}
                                aria-hidden={!isOpen}
                            >
                                <span
                                    className="size-6 shrink-0"
                                    aria-hidden
                                />
                                <div className="min-w-0 flex-1">
                                    <StageCaptionContent stage={stage} />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Wrapper>
    );
}
