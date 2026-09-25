'use client';

import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import Image from 'next/image';
import {gsap} from 'gsap';
import {
    pageDielineBorderYClass,
    pageDielineInnerClass,
    pageDielineOuterClass,
} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {PageHeadingContent} from '@/components/common/page-heading-section';
import {SanityImage} from '@/components/ui/sanity-image';
import type {ProductLineFrame} from '@/lib/catalog/types';
import {isSanityCdnUrl} from '@/lib/sanity/image';
import {WWW_ROUTES} from '@/lib/www-routes';

const PRODUCT_LINE_HERO_SECTION_ID = 'product-line-hero';
const HERO_HEADING_ID = 'product-line-hero-heading';
const KIT_MARK_PLACEHOLDER = '/solutions/hero-kit-placeholder.svg';
const FEATURE_IMAGE_PLACEHOLDER = '/products/hero-feature-placeholder.svg';
/** Final kit-mark size (matches prior PageHeading eyebrow). */
const MARK_SIZE_PX = 128;
/** Apple Books–style oversized start (~414px desktop). */
const MARK_BIG_MAX_PX = 414;
/** Blank hero before mark appears. */
const ENTER_BLANK_S = 0.45;
/** Dwell at large scale before shrink. */
const ENTER_HOLD_S = 0.35;
/** Scale-down duration. */
const ENTER_SCALE_S = 1.8;
/** Copy starts this far into the scale tween (0–1 of scale duration). */
const ENTER_COPY_AT_SCALE = 0.5;
/** Media rise starts this many seconds after copy begins. */
const ENTER_MEDIA_LAG_S = 0.12;

type ProductLineHeroProps = {
    h1: string;
    intro: string;
    frames: ProductLineFrame[];
    /** Kept for callers; scrub sequence is no longer used. */
    heroMode: 'sequence' | 'static';
    featuredImageUrl: string | null;
    featuredImageAlt: string;
    kitMarkUrl: string | null;
    kitMarkAlt: string;
    hasStyles: boolean;
};

function useIsMobile(): boolean {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 639px)');
        const sync = () => setIsMobile(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    return isMobile;
}

function usePrefersReducedMotion(): boolean {
    const [reduce, setReduce] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const sync = () => setReduce(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    return reduce;
}

function HeroFrameImage({
    src,
    alt,
    priority,
}: {
    src: string;
    alt: string;
    priority?: boolean;
}) {
    if (isSanityCdnUrl(src)) {
        return (
            <SanityImage
                src={src}
                alt={alt}
                width={1400}
                height={1050}
                sizes="(max-width: 1280px) 100vw, 1280px"
                className="h-auto w-full"
                priority={priority}
            />
        );
    }

    return (
        <Image
            src={src}
            alt={alt}
            width={1400}
            height={1050}
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="h-auto w-full"
            priority={priority}
            unoptimized
        />
    );
}

function KitMarkImage({src, alt}: {src: string; alt: string}) {
    // Request 2× the display box so retina stays sharp; cover fills the frame.
    const srcPx = MARK_SIZE_PX * 2;

    if (isSanityCdnUrl(src)) {
        return (
            <SanityImage
                src={src}
                alt={alt}
                width={srcPx}
                height={srcPx}
                quality={90}
                square
                className="size-full object-cover"
                priority
            />
        );
    }

    return (
        <Image
            src={src}
            alt={alt}
            width={srcPx}
            height={srcPx}
            quality={90}
            className="size-full object-cover"
            priority
            unoptimized
        />
    );
}

/**
 * Product-line landing hero (PROD-1914 Phase 3).
 * Enter: Apple Books–style blank → large mark → overlapping scale + copy → media rise.
 * Media: single feature image (no pin-scrub).
 */
export function ProductLineHero({
    h1,
    intro,
    frames,
    heroMode: _heroMode,
    featuredImageUrl,
    featuredImageAlt,
    kitMarkUrl,
    kitMarkAlt,
    hasStyles,
}: ProductLineHeroProps) {
    const isMobile = useIsMobile();
    const reduceMotion = usePrefersReducedMotion();
    /**
     * pending — hide until GSAP arms; active — oversized hold (no Y clip);
     * done — settled layout, full overflow-clip.
     */
    const [enterPhase, setEnterPhase] = useState<'pending' | 'active' | 'done'>(
        'pending',
    );

    const sectionRef = useRef<HTMLElement>(null);
    const markRef = useRef<HTMLDivElement>(null);
    const headingRef = useRef<HTMLDivElement>(null);
    const mediaRef = useRef<HTMLDivElement>(null);

    const featuredSrc = featuredImageUrl?.trim() || '';
    const kitMarkSrc = kitMarkUrl?.trim() || KIT_MARK_PLACEHOLDER;
    const resolvedKitMarkAlt = kitMarkUrl?.trim()
        ? kitMarkAlt.trim() || h1
        : `${h1} kit mark placeholder`;

    const frameWithSrc = frames.find((frame) => Boolean(frame.src?.trim()));
    const featureImage = featuredSrc
        ? {src: featuredSrc, alt: featuredImageAlt.trim() || h1}
        : frameWithSrc
          ? {
                src: frameWithSrc.src.trim(),
                alt: frameWithSrc.alt.trim() || h1,
            }
          : {
                src: FEATURE_IMAGE_PLACEHOLDER,
                alt: `${h1} featured image placeholder`,
            };

    const quoteCta = {
        label: 'Get a quote',
        href: WWW_ROUTES.requestExpress,
    } as const;

    const exploreStylesCta = {
        label: 'Explore styles',
        href: '#styles',
    } as const;

    // Filled primary = Get a quote; link secondary = Explore styles (with chevron).
    const primaryCta = quoteCta;
    const secondaryCta = hasStyles ? exploreStylesCta : undefined;
    const ctaOrder = 'primary-first' as const;

    // Apple Books enter: blank → mark appear + hold → scale with overlapping copy/media.
    useLayoutEffect(() => {
        const section = sectionRef.current;
        const mark = markRef.current;
        const heading = headingRef.current;
        const media = mediaRef.current;
        if (!section || !mark || !heading) {
            setEnterPhase('done');
            return;
        }

        const settleToDone = () => {
            gsap.set([mark, heading, media].filter(Boolean), {
                clearProps: 'all',
            });
            gsap.set(heading.querySelectorAll('h1, div'), {clearProps: 'all'});
            setEnterPhase('done');
        };

        const skip =
            isMobile ||
            reduceMotion ||
            window.matchMedia('(max-width: 639px)').matches ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (skip) {
            settleToDone();
            return;
        }

        let cancelled = false;
        let ctx: gsap.Context | null = null;

        const waitFrame = () =>
            new Promise<void>((resolve) => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => resolve());
                });
            });

        void (async () => {
            // Settle fluid mark size / layout before measuring for FLIP.
            if (document.fonts?.ready) {
                await document.fonts.ready;
            }
            // Two frame pairs so a late scroll restore is reflected before we
            // decide whether the hero is still in view (reload mid-page).
            await waitFrame();
            await waitFrame();
            if (cancelled) return;

            const sectionRect = section.getBoundingClientRect();
            const heroOffScreen =
                sectionRect.bottom <= 0 ||
                sectionRect.top >= window.innerHeight;
            if (heroOffScreen) {
                settleToDone();
                return;
            }

            const markRect = mark.getBoundingClientRect();
            const markLayoutPx = markRect.width || MARK_SIZE_PX;
            const bigPx = Math.min(MARK_BIG_MAX_PX, window.innerWidth * 0.65);
            const startScale = bigPx / markLayoutPx;
            const copyAt = ENTER_SCALE_S * ENTER_COPY_AT_SCALE;
            const copyDur = ENTER_SCALE_S - copyAt;
            const mediaAt = copyAt + ENTER_MEDIA_LAG_S;

            // Resting layout is top-of-stack; shift so the oversized mark is
            // optically centered in the browser window (Apple Books enter).
            const markCenterX = markRect.left + markRect.width / 2;
            const markCenterY = markRect.top + markRect.height / 2;
            const enterX = window.innerWidth / 2 - markCenterX;
            const enterY = window.innerHeight / 2 - markCenterY;

            // Heading layers rise from within the hero stage, not page bottom.
            const headingRect = heading.getBoundingClientRect();
            const fromBottom = Math.max(
                80,
                Math.min(window.innerHeight, sectionRect.bottom) -
                    headingRect.top +
                    24,
            );

            const titleEl = heading.querySelector('h1');
            let descEl: HTMLElement | null = null;
            let actionsEl: HTMLElement | null = null;
            if (titleEl) {
                let sib = titleEl.nextElementSibling;
                while (sib) {
                    if (sib instanceof HTMLElement) {
                        if (sib.querySelector('a')) {
                            actionsEl = sib;
                        } else if (!descEl) {
                            descEl = sib;
                        }
                    }
                    sib = sib.nextElementSibling;
                }
            }
            const layers = [titleEl, descEl, actionsEl].filter(
                (el): el is HTMLElement => Boolean(el),
            );

            if (cancelled) return;

            gsap.set(mark, {
                scale: startScale,
                x: enterX,
                y: enterY,
                transformOrigin: '50% 50%',
                opacity: 0,
                force3D: true,
            });
            layers.forEach((el, i) => {
                gsap.set(el, {
                    opacity: 0,
                    y: fromBottom * (1 + i * 0.04),
                });
            });
            if (media) gsap.set(media, {opacity: 0, y: 80});
            if (cancelled) return;
            // GSAP owns opacity; allow Y overflow while the mark is oversized.
            setEnterPhase('active');

            ctx = gsap.context(() => {
                const tl = gsap.timeline({
                    defaults: {ease: 'power2.out'},
                });

                // 1) Blank hero.
                tl.to({}, {duration: ENTER_BLANK_S});

                // 2) Mark appears at large scale, brief hold (window-centered).
                tl.to(mark, {opacity: 1, duration: 0.2, ease: 'power1.out'});
                tl.to({}, {duration: ENTER_HOLD_S});

                // 3) Scale down + settle back to layout position.
                const scaleStart = tl.duration();
                tl.to(mark, {
                    scale: 1,
                    x: 0,
                    y: 0,
                    duration: ENTER_SCALE_S,
                    ease: 'power3.inOut',
                    onComplete: () => {
                        if (!cancelled) setEnterPhase('done');
                    },
                });

                // 4) Title → description → actions rise with parallax stagger.
                layers.forEach((el, i) => {
                    tl.to(
                        el,
                        {
                            opacity: 1,
                            y: 0,
                            duration: copyDur,
                            ease: 'power3.out',
                        },
                        scaleStart + copyAt + i * 0.01,
                    );
                });

                // 5) Feature image rises from below, overlapping late scale.
                if (media) {
                    tl.to(
                        media,
                        {
                            opacity: 1,
                            y: 0,
                            duration: 0.85,
                            ease: 'power3.out',
                        },
                        scaleStart + mediaAt,
                    );
                }
            }, section);
        })();

        return () => {
            cancelled = true;
            ctx?.revert();
        };
    }, [isMobile, reduceMotion]);

    return (
        <section
            ref={sectionRef}
            id={PRODUCT_LINE_HERO_SECTION_ID}
            aria-labelledby={HERO_HEADING_ID}
            data-enter={enterPhase === 'done' ? undefined : enterPhase}
            className={cn(
                pageDielineOuterClass(),
                pageDielineBorderYClass({borderBottom: true}),
                'relative bg-gradient-to-b from-muted from-0% via-background via-[65%] to-background',
                // Clip Y only after the oversized mark has settled (avoids asymmetric clip).
                enterPhase === 'done'
                    ? 'overflow-clip'
                    : 'overflow-x-clip overflow-y-visible',
            )}
        >
            <div className={pageDielineInnerClass('flex flex-col gap-1')}>
                <div className="relative z-10 flex flex-col items-center gap-7 pt-8 pb-0 sm:pt-10 lg:pt-12">
                    <div
                        ref={markRef}
                        className={cn(
                            'relative mx-auto shrink-0 overflow-hidden rounded-xl border border-blue-950 bg-background/50',
                            'size-display-mark',
                            enterPhase === 'pending' && 'opacity-0',
                        )}
                    >
                        <KitMarkImage
                            src={kitMarkSrc}
                            alt={resolvedKitMarkAlt}
                        />
                    </div>

                    <div
                        ref={headingRef}
                        className={cn(
                            'w-full',
                            enterPhase === 'pending' && 'opacity-0',
                        )}
                    >
                        <PageHeadingContent
                            align="center"
                            title={h1}
                            titleId={HERO_HEADING_ID}
                            description={intro || undefined}
                            primaryCta={primaryCta}
                            secondaryCta={secondaryCta}
                            ctaOrder={ctaOrder}
                            titleClassName="max-w-[1066px] text-display font-bold tracking-[-0.82px]"
                            descriptionClassName="max-w-[732px] text-xl leading-7 text-foreground"
                        />
                    </div>
                </div>

                <div
                    ref={mediaRef}
                    className={cn(
                        'pb-12',
                        enterPhase === 'pending' && 'opacity-0',
                    )}
                >
                    <div className="mx-auto w-full xl:max-w-4xl overflow-hidden rounded-2xl">
                        <HeroFrameImage
                            src={featureImage.src}
                            alt={featureImage.alt}
                            priority
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
