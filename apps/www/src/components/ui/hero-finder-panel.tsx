'use client';

import {
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import {
    CarouselItem,
    type CarouselApi,
} from '@pakfactory/ui/components/carousel';

import {cn} from '@pakfactory/ui/lib/utils';

import {PageHeadingContent} from '@/components/common/page-heading-section';
import {MediaCaptionCard} from '@/components/ui/media-caption-card';
import {buildFinderHeadingTitle} from '@/components/ui/hero-finder-shared';
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
import {headingSettleProps} from '@/lib/ui/heading-settle';
import {useQueryParamState} from '@/lib/ui/use-query-param-state';

/** Tailwind `md` — Finder rail shows ~2 cards; caption sits in slot 2. */
const FINDER_TWO_UP_MQ = '(min-width: 768px)';

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
 * The media rail is a full-bleed `SectionCarousel` of `MediaCaptionCard`s.
 * Packaging Solution × All uses Studio General buckets; other picks use Specific
 * relatedness (styles, industries, expertise defaults, relative case studies).
 * The second viewport slot keeps the detail caption always on; peers reveal it
 * on hover. Card click (not drag) navigates to that slide’s CTA.
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

/**
 * Caption target for the Finder rail: selected slide on 1-up; selected+1 on
 * 2-up (the second visible slot), wrapping when Embla loop is on.
 */
function useFinderCaptionSlot(slideCount: number, loop: boolean) {
    const [api, setApi] = useState<CarouselApi>();
    const [twoUp, setTwoUp] = useState(() =>
        typeof window !== 'undefined'
            ? window.matchMedia(FINDER_TWO_UP_MQ).matches
            : true,
    );
    const [featuredIndex, setFeaturedIndex] = useState(() =>
        slideCount > 1 ? 1 : 0,
    );

    useEffect(() => {
        const mq = window.matchMedia(FINDER_TWO_UP_MQ);
        const sync = () => setTwoUp(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    const syncFeatured = useCallback(
        (carouselApi: CarouselApi) => {
            if (!carouselApi) return;
            const selected = carouselApi.selectedScrollSnap();
            if (!twoUp || slideCount <= 1) {
                setFeaturedIndex(selected);
                return;
            }
            const next = selected + 1;
            setFeaturedIndex(
                loop ? next % slideCount : Math.min(next, slideCount - 1),
            );
        },
        [twoUp, slideCount, loop],
    );

    useEffect(() => {
        if (!api) return;
        syncFeatured(api);
        api.on('select', syncFeatured);
        api.on('reInit', syncFeatured);
        return () => {
            api.off('select', syncFeatured);
            api.off('reInit', syncFeatured);
        };
    }, [api, syncFeatured]);

    // Slides swap when line/industry changes — keep caption on slot 2 until Embla reInits.
    useEffect(() => {
        if (slideCount <= 1) {
            setFeaturedIndex(0);
            return;
        }
        setFeaturedIndex(twoUp ? 1 : 0);
    }, [slideCount, twoUp]);

    return {setApi, featuredIndex};
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
        generalRail: content.generalRail,
    });
    const loop = slides.length > 1;

    return (
        <HeroFinderPanelRail
            content={content}
            titleId={titleId}
            actions={actions}
            line={line}
            industry={industry}
            lines={lines}
            rankedIndustries={rankedIndustries}
            slides={slides}
            loop={loop}
            onLineChange={onLineChange}
            onIndustryChange={onIndustryChange}
        />
    );
}

/**
 * Split so caption-slot hooks run after we know `slides.length` (rules of hooks).
 */
function HeroFinderPanelRail({
    content,
    titleId,
    actions,
    line,
    industry,
    lines,
    rankedIndustries,
    slides,
    loop,
    onLineChange,
    onIndustryChange,
}: {
    content: HeroFinderContent;
    titleId: string;
    actions?: ReactNode;
    line: HeroFinderLine;
    industry: HeroFinderIndustry;
    lines: HeroFinderLine[];
    rankedIndustries: HeroFinderIndustry[];
    slides: ReturnType<typeof buildFinderSlides>;
    loop: boolean;
    onLineChange: (slug: string) => void;
    onIndustryChange: (slug: string) => void;
}) {
    const {setApi, featuredIndex} = useFinderCaptionSlot(
        slides.length,
        loop,
    );

    const title = buildFinderHeadingTitle({
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
    });

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
                        setApi={setApi}
                        controls="playPause"
                        loop={loop}
                        slideGap="finder"
                    >
                        {slides.map((slide, index) => {
                            const featured = index === featuredIndex;
                            const settle = headingSettleProps(index);
                            return (
                                <CarouselItem
                                    key={slide.id}
                                    className={cn(
                                        FINDER_CAROUSEL_ITEM_CLASS,
                                        settle.className,
                                    )}
                                    style={settle.style}
                                >
                                    <MediaCaptionCard
                                        title={slide.title}
                                        description={slide.description}
                                        image={slide.image}
                                        imageFit={slide.imageFit}
                                        videoSrc={slide.videoSrc}
                                        link={slide.link}
                                        captionMode={
                                            featured ? 'always' : 'hover'
                                        }
                                        className="aspect-video sm:aspect-5/4"
                                    />
                                </CarouselItem>
                            );
                        })}
                    </SectionCarousel>
                </div>
            ) : null}
        </div>
    );
}
