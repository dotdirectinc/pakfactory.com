'use client';

import {Suspense, useMemo, useState, type ReactNode} from 'react';
import {CarouselItem} from '@pakfactory/ui/components/carousel';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@pakfactory/ui/components/select';

import {PageHeadingContent} from '@/components/common/page-heading-section';
import {MediaCaptionCard} from '@/components/ui/media-caption-card';
import {
    SectionCarousel,
    FINDER_CAROUSEL_ITEM_CLASS,
} from '@/components/ui/section-carousel';
import {
    FINDER_INDUSTRY_SENTINEL_SLUG,
    FINDER_LINE_SENTINEL_SLUG,
    buildFinderSlides,
    isFinderIndustrySentinel,
    isFinderLineSentinel,
    rankIndustriesWithAllFirst,
    withFinderSentinels,
} from '@/lib/sections/hero-finder-match';
import type {
    HeroFinderContent,
    HeroFinderIndustry,
    HeroFinderLine,
} from '@/lib/sections/map-hero';
import {useQueryParamState} from '@/lib/ui/use-query-param-state';

type HeroFinderPanelProps = {
    content: HeroFinderContent;
    titleId: string;
    /** Server-rendered CTA pair + rating. */
    actions?: ReactNode;
};

/**
 * Finder hero (PROD-2666) — the H1 is a sentence with two pickers:
 * "Custom [line] for" / "[industry] brands." Defaults are always
 * Packaging Solution × All (synthetic); curated options follow.
 *
 * The media rail is a full-bleed `SectionCarousel` of `MediaCaptionCard`s built
 * from the current picks plus curated neighbours so the track is scrollable.
 */
export function HeroFinderPanel(props: HeroFinderPanelProps) {
    return (
        <Suspense fallback={<HeroFinderPanelLocal {...props} />}>
            <HeroFinderPanelSynced {...props} />
        </Suspense>
    );
}

function useFinderOptions(content: HeroFinderContent) {
    return useMemo(
        () => withFinderSentinels(content.lines, content.industries),
        [content.lines, content.industries],
    );
}

function HeroFinderPanelSynced(props: HeroFinderPanelProps) {
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
        <HeroFinderPanelChrome
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

/** Suspense fallback — local state only, no `useSearchParams`. */
function HeroFinderPanelLocal(props: HeroFinderPanelProps) {
    const {lines, industries} = useFinderOptions(props.content);
    const [lineSlug, setLineSlug] = useState(FINDER_LINE_SENTINEL_SLUG);
    const [industrySlug, setIndustrySlug] = useState(FINDER_INDUSTRY_SENTINEL_SLUG);

    const line = resolveBySlug(lines, lineSlug) ?? lines[0];
    const industry = resolveBySlug(industries, industrySlug) ?? industries[0];

    return (
        <HeroFinderPanelChrome
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

function HeroFinderPanelChrome({
    content,
    titleId,
    actions,
    lines,
    industries,
    line,
    industry,
    onLineChange,
    onIndustryChange,
}: HeroFinderPanelProps & {
    lines: HeroFinderLine[];
    industries: HeroFinderIndustry[];
    line?: HeroFinderLine;
    industry?: HeroFinderIndustry;
    onLineChange: (slug: string) => void;
    onIndustryChange: (slug: string) => void;
}) {
    if (!line || !industry) return null;

    const curatedLines = lines.filter((item) => !isFinderLineSentinel(item));
    const curatedIndustries = industries.filter(
        (item) => !isFinderIndustrySentinel(item),
    );
    const rankedIndustries = rankIndustriesWithAllFirst(industries, line.id);
    const slides = buildFinderSlides({
        line,
        industry,
        curatedLines,
        curatedIndustries,
    });

    // Always two lines: "Custom [line]" / "for [industry] brands."
    // Extra top margin on line 2 so muted picker chips do not touch.
    const title = (
        <>
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
        </>
    );

    return (
        <div className="flex flex-col gap-12">
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
            {slides.length > 0 ? (
                <div aria-live="polite">
                    <SectionCarousel
                        prevLabel="Previous results"
                        nextLabel="Next results"
                        loop={slides.length > 2}
                    >
                        {slides.map((slide) => (
                            <CarouselItem
                                key={slide.id}
                                className={FINDER_CAROUSEL_ITEM_CLASS}
                            >
                                <MediaCaptionCard
                                    kindLabel={slide.kindLabel}
                                    title={slide.title}
                                    description={slide.description}
                                    image={slide.image}
                                    imageFit={slide.imageFit}
                                    link={slide.link}
                                    stat={slide.stat}
                                />
                            </CarouselItem>
                        ))}
                    </SectionCarousel>
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
                className="inline-flex h-auto cursor-pointer gap-2 rounded-[length:var(--radius-control)] border-0 bg-muted px-2 py-0 align-baseline font-[inherit] text-[length:inherit] leading-[inherit] tracking-[inherit] text-foreground shadow-none hover:bg-muted/80 data-[size=default]:h-auto [&>svg]:size-[0.5em] [&>svg]:text-foreground [&>svg]:opacity-100"
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
