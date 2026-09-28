import type {CSSProperties} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {ChevronDown} from 'lucide-react';
import {
    pageDielineBorderYClass,
    pageDielineInnerClass,
    pageDielineOuterClass,
} from '@pakfactory/ui/components/page-dieline-section';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

import {InPageAnchorLink} from '@/components/common/in-page-anchor-link';
import {PageHeadingContent} from '@/components/common/page-heading-section';
import {ProductLineHeroMediaMarquee} from '@/components/product/product-line-hero-media-marquee';
import {SanityImage} from '@/components/ui/sanity-image';
import type {ProductLineFrame, Product} from '@/lib/catalog/types';
import {
    assembleHeroMediaCards,
    type ProductLineHeroLayout,
    type ProductLineHeroMediaCard,
} from '@/lib/catalog/product-line-landing';
import {isSanityCdnUrl} from '@/lib/sanity/image';
import {headingSettleProps} from '@/lib/ui/heading-settle';
import {WWW_ROUTES} from '@/lib/www-routes';

const PRODUCT_LINE_HERO_SECTION_ID = 'product-line-hero';
const HERO_HEADING_ID = 'product-line-hero-heading';
const FEATURED_ICON_PLACEHOLDER = '/solutions/hero-kit-placeholder.svg';
const FEATURE_IMAGE_PLACEHOLDER = '/products/hero-feature-placeholder.svg';
/** Final featured-icon size for stack hero (matches prior PageHeading eyebrow). */
const FEATURED_ICON_SIZE_STACK_PX = 128;

type ProductLineHeroProps = {
    h1: string;
    intro: string;
    frames: ProductLineFrame[];
    /** Kept for callers; image-sequence scrub is no longer used. */
    heroMode: 'sequence' | 'static';
    heroLayout: ProductLineHeroLayout;
    featuredImageUrl: string | null;
    featuredImageAlt: string;
    /** Hover-play MP4 on bottomBar featured marquee card; unused on stack. */
    featuredVideoUrl: string | null;
    featuredIconUrl: string | null;
    featuredIconAlt: string;
    /** Standard products on this line — preferred bottomBar marquee source. */
    products: Product[];
    hasStyles: boolean;
};

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

function FeaturedIconImage({
    src,
    alt,
    displayPx,
}: {
    src: string;
    alt: string;
    displayPx: number;
}) {
    // Request 2× the display box so retina stays sharp; cover fills the frame.
    const srcPx = displayPx * 2;

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

type HeroCta = {label: string; href: string};

function HeroCtaGroup({
    primaryCta,
    secondaryCta,
    className,
    style,
}: {
    primaryCta: HeroCta;
    secondaryCta?: HeroCta;
    className?: string;
    style?: CSSProperties;
}) {
    const primary = (
        <Button asChild size="xl" variant="default">
            {primaryCta.href.startsWith('#') ? (
                <InPageAnchorLink href={primaryCta.href as `#${string}`}>
                    {primaryCta.label}
                </InPageAnchorLink>
            ) : (
                <Link href={primaryCta.href}>{primaryCta.label}</Link>
            )}
        </Button>
    );

    const secondary = secondaryCta ? (
        <Button asChild size="xl" variant="link" className="gap-2">
            {secondaryCta.href.startsWith('#') ? (
                <InPageAnchorLink href={secondaryCta.href as `#${string}`}>
                    {secondaryCta.label}
                    <ChevronDown className="size-4" aria-hidden />
                </InPageAnchorLink>
            ) : (
                <Link href={secondaryCta.href}>
                    {secondaryCta.label}
                    <ChevronDown className="size-4" aria-hidden />
                </Link>
            )}
        </Button>
    ) : null;

    return (
        <div
            className={cn(
                'flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center',
                className,
            )}
            style={style}
        >
            {primary}
            {secondary}
        </div>
    );
}

/**
 * Product-line landing hero (PROD-1914 Phase 3).
 * `stack` = featured icon + copy above media; `bottomBar` = media marquee above
 * type (featured icon hidden for now).
 */
export function ProductLineHero({
    h1,
    intro,
    frames,
    heroMode: _heroMode,
    heroLayout,
    featuredImageUrl,
    featuredImageAlt,
    featuredVideoUrl,
    featuredIconUrl,
    featuredIconAlt,
    products,
    hasStyles,
}: ProductLineHeroProps) {
    const featuredSrc = featuredImageUrl?.trim() || '';
    const featuredVideo = featuredVideoUrl?.trim() || '';
    const featuredIconSrc = featuredIconUrl?.trim() || FEATURED_ICON_PLACEHOLDER;
    const resolvedFeaturedIconAlt = featuredIconUrl?.trim()
        ? featuredIconAlt.trim() || h1
        : `${h1} featured icon placeholder`;

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

    const primaryCta = {
        label: 'Get a quote',
        href: WWW_ROUTES.requestExpress,
    } as const;
    const secondaryCta = hasStyles
        ? ({label: 'Explore styles', href: '#styles'} as const)
        : undefined;

    if (heroLayout === 'bottomBar') {
        const mediaCards = assembleHeroMediaCards({
            featuredImageUrl: featureImage.src,
            featuredImageAlt: featureImage.alt,
            featuredVideoUrl: featuredVideo || null,
            frames,
            products,
        });

        return (
            <ProductLineHeroBottomBar
                h1={h1}
                intro={intro}
                mediaCards={mediaCards}
                primaryCta={primaryCta}
                secondaryCta={secondaryCta}
            />
        );
    }

    return (
        <ProductLineHeroStack
            h1={h1}
            intro={intro}
            featureImage={featureImage}
            featuredIconSrc={featuredIconSrc}
            featuredIconAlt={resolvedFeaturedIconAlt}
            primaryCta={primaryCta}
            secondaryCta={secondaryCta}
        />
    );
}

function ProductLineHeroStack({
    h1,
    intro,
    featureImage,
    featuredIconSrc,
    featuredIconAlt,
    primaryCta,
    secondaryCta,
}: {
    h1: string;
    intro: string;
    featureImage: {src: string; alt: string};
    featuredIconSrc: string;
    featuredIconAlt: string;
    primaryCta: HeroCta;
    secondaryCta?: HeroCta;
}) {
    const featuredIconSettle = headingSettleProps(0);
    // Featured icon = 0; PageHeadingContent settleOffset 1 → H1 → optional intro → CTAs.
    const featureSettleStep = 1 + 1 + (intro.trim() ? 1 : 0) + 1;
    const featureSettle = headingSettleProps(featureSettleStep);

    return (
        <section
            id={PRODUCT_LINE_HERO_SECTION_ID}
            aria-labelledby={HERO_HEADING_ID}
            className={cn(
                pageDielineOuterClass(),
                pageDielineBorderYClass({borderBottom: true}),
                'relative overflow-clip bg-gradient-to-b from-muted from-0% via-background via-[65%] to-background',
            )}
        >
            <div className={pageDielineInnerClass('flex flex-col gap-1')}>
                <div className="relative z-10 flex flex-col items-center gap-7 pt-8 pb-0 sm:pt-10 lg:pt-12">
                    <div
                        className={cn(
                            'relative mx-auto size-display-mark shrink-0 overflow-hidden rounded-xl border border-dashed border-background-muted bg-background/20',
                            featuredIconSettle.className,
                        )}
                        style={featuredIconSettle.style}
                    >
                        <FeaturedIconImage
                            src={featuredIconSrc}
                            alt={featuredIconAlt}
                            displayPx={FEATURED_ICON_SIZE_STACK_PX}
                        />
                    </div>

                    <div className="w-full">
                        <PageHeadingContent
                            align="center"
                            title={h1}
                            titleId={HERO_HEADING_ID}
                            description={intro || undefined}
                            primaryCta={primaryCta}
                            secondaryCta={secondaryCta}
                            ctaOrder="primary-first"
                            settle
                            settleOffset={1}
                            titleClassName="max-w-[1066px] text-display font-bold tracking-[-0.82px]"
                            descriptionClassName="max-w-[732px] text-xl leading-7 text-foreground"
                        />
                    </div>
                </div>

                <div className="pb-12">
                    <div
                        className={cn(
                            'mx-auto w-full overflow-hidden rounded-2xl xl:max-w-4xl',
                            featureSettle.className,
                        )}
                        style={featureSettle.style}
                    >
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

function ProductLineHeroBottomBar({
    h1,
    intro,
    mediaCards,
    primaryCta,
    secondaryCta,
}: {
    h1: string;
    intro: string;
    mediaCards: ProductLineHeroMediaCard[];
    primaryCta: HeroCta;
    secondaryCta?: HeroCta;
}) {
    const mediaSettle = headingSettleProps(0);
    const titleSettle = headingSettleProps(1);
    const introSettle = intro.trim()
        ? headingSettleProps(2)
        : undefined;
    const ctaSettle = headingSettleProps(intro.trim() ? 3 : 2);

    return (
        <section
            id={PRODUCT_LINE_HERO_SECTION_ID}
            aria-labelledby={HERO_HEADING_ID}
            className={cn(
                pageDielineOuterClass(),
                pageDielineBorderYClass({borderBottom: true}),
                'relative overflow-x-clip bg-gradient-to-b from-muted from-0% via-background via-[65%] to-background',
            )}
        >
            <div
                className={pageDielineInnerClass(
                    'flex flex-col pt-8 sm:pt-10 lg:pt-12',
                )}
            >
                {/* Full-viewport track; vertical dielines stay on this column. */}
                <div className="relative right-1/2 left-1/2 -mr-[50vw] -ml-[50vw] w-screen max-w-[100vw]">
                    <ProductLineHeroMediaMarquee
                        cards={mediaCards}
                        className={mediaSettle.className}
                        style={mediaSettle.style}
                    />
                </div>

                {/* 40px (pt-10) clearance above the heading — muted→white reads here. */}
                <div className="pb-10 pt-10 sm:pb-12">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
                        <div className="flex min-w-0 flex-col gap-3 lg:max-w-3xl">
                            <h1
                                id={HERO_HEADING_ID}
                                className={cn(
                                    // Match PageHeadingContent default: size after
                                    // color so twMerge keeps `text-display-lg`.
                                    'font-medium tracking-tight text-foreground text-display-lg',
                                    titleSettle.className,
                                )}
                                style={titleSettle.style}
                            >
                                {h1}
                            </h1>
                            {intro.trim() ? (
                                <p
                                    className={cn(
                                        'max-w-3xl text-xl leading-7 text-muted-foreground',
                                        introSettle?.className,
                                    )}
                                    style={introSettle?.style}
                                >
                                    {intro}
                                </p>
                            ) : null}
                        </div>

                        <HeroCtaGroup
                            primaryCta={primaryCta}
                            secondaryCta={secondaryCta}
                            className={cn('shrink-0', ctaSettle.className)}
                            style={ctaSettle.style}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
