'use client';

import {
    Suspense,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import {Badge} from '@pakfactory/ui/components/badge';
import {Button} from '@pakfactory/ui/components/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@pakfactory/ui/components/select';

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
import {useQueryParamState} from '@/lib/ui/use-query-param-state';

const PREV_VISIBLE = 2;
const RIGHT_INSET_PX = 100;

type HeroFinderFullscreenPanelProps = {
    content: HeroFinderFullscreenContent;
    titleId: string;
    actions?: ReactNode;
};

export function HeroFinderFullscreenPanel(props: HeroFinderFullscreenPanelProps) {
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
    const industry = resolveBySlug(industries, values.industry) ?? industries[0];

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
    const [industrySlug, setIndustrySlug] = useState(FINDER_INDUSTRY_SENTINEL_SLUG);
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
    if (!line || !industry) return null;

    const curatedLines = lines.filter((item) => !isFinderLineSentinel(item));
    const rankedIndustries = rankIndustriesWithAllFirst(industries, line.id);
    const isGeneral =
        isFinderLineSentinel(line) && isFinderIndustrySentinel(industry);

    const slides: FinderFullscreenSlide[] = isGeneral
        ? content.generalSlides
        : buildFinderFullscreenSpecificSlides({
              line,
              industry,
              curatedLines,
          });

    const [activeIndex, setActiveIndex] = useState(0);
    const safeIndex =
        slides.length === 0 ? 0 : Math.min(activeIndex, slides.length - 1);
    const active = slides[safeIndex];

    const deckKey = `${line.slug}:${industry.slug}:${slides.map((s) => s.id).join(',')}`;
    useEffect(() => {
        setActiveIndex(0);
    }, [deckKey]);

    const prevSlides = slides.slice(
        Math.max(0, safeIndex - PREV_VISIBLE),
        safeIndex,
    );
    const nextSlide =
        safeIndex < slides.length - 1 ? slides[safeIndex + 1] : null;

    const go = (next: number) => {
        if (slides.length === 0) return;
        setActiveIndex(((next % slides.length) + slides.length) % slides.length);
    };

    const bgImage = active?.image;

    return (
        <div className="relative isolate min-h-svh overflow-hidden">
            {/* Active slide background */}
            <div className="absolute inset-0 bg-muted" aria-hidden>
                {bgImage ? (
                    <SanityImage
                        src={bgImage.src}
                        alt=""
                        fill
                        priority
                        sizes="100vw"
                        className="object-cover"
                    />
                ) : null}
            </div>

            {/* Soft top-left sunburst glass (stacked frost + blur; rim softens via fade) */}
            <div
                aria-hidden
                className="pointer-events-none absolute -left-40 -top-48 size-[48rem] rounded-full bg-background/25 backdrop-blur-2xl [mask-image:radial-gradient(closest-side,black_35%,transparent_100%)]"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -left-16 -top-16 size-[28rem] rounded-full bg-background/40 backdrop-blur-xl [mask-image:radial-gradient(closest-side,black_40%,transparent_100%)]"
            />

            {/* Copy stack */}
            <div className="relative z-10 flex max-w-xl flex-col gap-4 px-6 pb-56 pt-16 text-foreground sm:px-10 sm:pt-20">
                {content.eyebrow ? (
                    <p className="text-sm font-medium uppercase tracking-wider text-foreground/80">
                        {content.eyebrow}
                    </p>
                ) : null}
                <h1
                    id={titleId}
                    className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl"
                >
                    {content.headingLead}{' '}
                    <FinderPicker
                        label="Product line"
                        value={line.slug}
                        valueLabel={line.title}
                        options={lines.map((item) => ({
                            id: item.slug,
                            title: item.title,
                        }))}
                        onChange={onLineChange}
                    />
                    <span className="mt-2 block">
                        {content.headingJoin}{' '}
                        <FinderPicker
                            label="Industry"
                            value={industry.slug}
                            valueLabel={industry.title}
                            options={rankedIndustries.map((item) => ({
                                id: item.slug,
                                title: item.title,
                            }))}
                            onChange={onIndustryChange}
                        />
                        {content.headingTrail ? <> {content.headingTrail}</> : null}
                    </span>
                </h1>
                {content.intro ? (
                    <p className="max-w-md text-base leading-7 text-foreground/80">
                        {content.intro}
                    </p>
                ) : null}
                {actions}
            </div>

            {/* Push dock rail */}
            {slides.length > 0 && active ? (
                <div className="absolute inset-x-0 bottom-0 z-20 h-52 overflow-hidden">
                    <div
                        className="absolute bottom-10 flex items-end justify-end gap-6"
                        style={{left: 24, right: CARD_RIGHT_EDGE}}
                    >
                        {prevSlides.map((slide) => {
                            const index = slides.findIndex((s) => s.id === slide.id);
                            return (
                                <button
                                    key={slide.id}
                                    type="button"
                                    onClick={() => setActiveIndex(index)}
                                    className="cursor-pointer whitespace-nowrap text-left text-2xl font-semibold tracking-tight text-foreground/55 transition-colors hover:text-foreground/80"
                                >
                                    {slide.kindLabel}
                                </button>
                            );
                        })}
                    </div>

                    <div
                        className="absolute bottom-6"
                        style={{right: RIGHT_INSET_PX}}
                    >
                        <DetailCard slide={active} />
                    </div>

                    {nextSlide ? (
                        <div
                            className="absolute bottom-12 overflow-hidden"
                            style={{right: 8, width: RIGHT_INSET_PX - 16}}
                        >
                            <button
                                type="button"
                                onClick={() => go(safeIndex + 1)}
                                className="cursor-pointer whitespace-nowrap text-left text-2xl font-semibold tracking-tight text-foreground/70"
                            >
                                {nextSlide.kindLabel}
                            </button>
                        </div>
                    ) : null}

                    <div className="absolute bottom-2 left-6 flex gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => go(safeIndex - 1)}
                            aria-label="Previous"
                        >
                            Previous
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => go(safeIndex + 1)}
                            aria-label="Next"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

const CARD_W = 280;
const CARD_RIGHT_EDGE = CARD_W + RIGHT_INSET_PX + 24;

function DetailCard({slide}: {slide: FinderFullscreenSlide}) {
    return (
        <div
            className="flex flex-col gap-4 rounded-xl bg-background p-6 text-foreground shadow-md"
            style={{width: CARD_W}}
        >
            <Badge variant="secondary" className="w-fit uppercase tracking-wider">
                {slide.kindLabel}
            </Badge>
            <div className="flex flex-col gap-1">
                <p className="text-lg font-medium leading-snug">{slide.title}</p>
                {slide.description ? (
                    <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {slide.description}
                    </p>
                ) : null}
            </div>
            {slide.stat || slide.link ? (
                <div className="flex flex-wrap items-end justify-between gap-4">
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

function FinderPicker({
    label,
    value,
    valueLabel,
    options,
    onChange,
}: {
    label: string;
    value: string;
    valueLabel: string;
    options: {id: string; title: string}[];
    onChange: (id: string) => void;
}) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger
                aria-label={label}
                className="inline-flex h-auto cursor-pointer gap-2 rounded-[length:var(--radius-control)] border-0 bg-background/70 px-2 py-0 align-baseline font-[inherit] text-[length:inherit] leading-[inherit] tracking-[inherit] text-foreground shadow-none backdrop-blur-sm hover:bg-background/85 data-[size=default]:h-auto [&>svg]:size-[0.5em] [&>svg]:text-foreground [&>svg]:opacity-100"
            >
                <SelectValue>{valueLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent position="popper">
                {options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                        {option.title}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
