import Image from 'next/image';
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
 * Static RSC shell — kit mark, copy/CTAs, and feature image render settled
 * (same spirit as SolutionHero; enter motion deferred).
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

    const primaryCta = {
        label: 'Get a quote',
        href: WWW_ROUTES.requestExpress,
    } as const;
    const secondaryCta = hasStyles
        ? ({label: 'Explore styles', href: '#styles'} as const)
        : undefined;

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
                    <div className="relative mx-auto size-display-mark shrink-0 overflow-hidden rounded-xl border border-dashed border-background-muted bg-background/20">
                        <KitMarkImage
                            src={kitMarkSrc}
                            alt={resolvedKitMarkAlt}
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
                            titleClassName="max-w-[1066px] text-display font-bold tracking-[-0.82px]"
                            descriptionClassName="max-w-[732px] text-xl leading-7 text-foreground"
                        />
                    </div>
                </div>

                <div className="pb-12">
                    <div className="mx-auto w-full overflow-hidden rounded-2xl xl:max-w-4xl">
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
