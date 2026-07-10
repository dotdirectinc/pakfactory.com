import Link from 'next/link';
import Image from 'next/image';
import {ArrowRight} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';
import type {BlogPromo} from '@/lib/blog-data';
import {externalLinkAttributes} from '@/lib/external-link';

type PromoImage = {url?: string};

/**
 * Blog promo banner (PROD-1896) — green full-width promo card.
 *
 * Content is editor-driven from the `promoBanner` page-builder block.
 * The fallbacks below are placeholders used only until an editor fills the
 * block — replace-by-content, no code change needed. Matches Figma 2405:27763 /
 * cta-section-04 (floating collage over green card).
 */
const FALLBACK = {
    heading: 'Custom packaging, made simple',
    body: 'From concept to delivery, PakFactory helps you design, prototype, and produce packaging that stands out.',
    ctaLabel: 'Get started',
    ctaUrl: '/',
};

function PromoImageTile({
    src,
    className,
    sizes = '160px',
}: {
    src: string;
    className?: string;
    sizes?: string;
}) {
    return (
        <div className={cn('relative  rounded-xl', className)}>
            <Image
                src={src}
                alt=""
                fill
                className="object-cover"
                sizes={sizes}
            />
        </div>
    );
}

function PromoBannerImagePlaceholders() {
    return (
        <>
            <div className="size-32 rounded-xl bg-primary-foreground/10 md:size-40" />
            <div className="mt-6 size-32 rounded-xl bg-primary-foreground/10 md:size-40" />
        </>
    );
}

function PromoBannerCopy({
    heading,
    body,
    ctaLabel,
    ctaUrl,
}: {
    heading: string;
    body: string;
    ctaLabel: string;
    ctaUrl: string;
}) {
    return (
        <div className="flex w-full flex-col gap-4 md:flex-1">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-primary-foreground md:text-4xl">
                {heading}
            </h2>
            <p className="max-w-[520px] text-lg leading-7 text-primary-foreground md:text-xl">
                {body}
            </p>
            <Button
                asChild
                className="mt-1 w-fit gap-2 rounded-[10px] bg-background px-6 text-base font-medium text-foreground hover:bg-background/90"
            >
                <Link href={ctaUrl} {...externalLinkAttributes(ctaUrl)}>
                    {ctaLabel}
                    <ArrowRight className="size-4" aria-hidden />
                </Link>
            </Button>
        </div>
    );
}

/** Mobile: stacked tiles above the card (no absolute breakout). */
function FloatingCollageMobile({images}: {images: PromoImage[]}) {
    return (
        <div className="flex w-full flex-col items-center gap-3 md:hidden">
            {images.map((img, i) =>
                img.url ? (
                    <PromoImageTile
                        key={img.url ?? i}
                        src={img.url}
                        className="aspect-4/3 w-full max-w-[220px]"
                        sizes="220px"
                    />
                ) : null,
            )}
        </div>
    );
}

/** Desktop: single large tile that breaks out of the green card. */
function FloatingCollageOne({url}: {url: string}) {
    return (
        <PromoImageTile
            src={url}
            className="aspect-3/4 w-72 lg:w-80"
            sizes="320px"
        />
    );
}

/** Desktop: two staggered tiles. */
function FloatingCollageTwo({images}: {images: PromoImage[]}) {
    return (
        <div className="relative h-72 w-64 lg:h-80 lg:w-72">
            {images.map((img, i) =>
                img.url ? (
                    <PromoImageTile
                        key={img.url ?? i}
                        src={img.url}
                        className={cn(
                            'absolute size-36 lg:size-40',
                            i === 0
                                ? 'top-0 left-0 z-10'
                                : 'right-0 bottom-0 z-20',
                        )}
                        sizes="160px"
                    />
                ) : null,
            )}
        </div>
    );
}

/** Desktop: three-tile staggered collage (Figma silhouette). */
function FloatingCollageThree({images}: {images: PromoImage[]}) {
    const [leftTop, leftBottom, main] = images;
    if (!leftTop?.url || !leftBottom?.url || !main?.url) return null;

    return (
        <div className="relative h-80 w-72 lg:h-88 lg:w-80">
            <PromoImageTile
                src={leftTop.url}
                className="absolute top-0 left-0 z-10 size-28 lg:size-32"
                sizes="128px"
            />
            <PromoImageTile
                src={leftBottom.url}
                className="absolute bottom-0 left-2 z-10 h-36 w-24 lg:left-3 lg:h-40 lg:w-28"
                sizes="112px"
            />
            <PromoImageTile
                src={main.url}
                className="absolute top-4 right-0 z-20 h-72 w-40 lg:h-80 lg:w-44"
                sizes="176px"
            />
        </div>
    );
}

function FloatingCollageDesktop({images}: {images: PromoImage[]}) {
    if (images.length === 1 && images[0]?.url) {
        return <FloatingCollageOne url={images[0].url} />;
    }
    if (images.length === 2) {
        return <FloatingCollageTwo images={images} />;
    }
    if (images.length >= 3) {
        return <FloatingCollageThree images={images} />;
    }
    return null;
}

/**
 * Two-column layout: left collage at 120% width overflows its column;
 * right column is the green card with copy only. Matches Figma cta-section-04.
 */
function PromoBannerFloating({
    images,
    heading,
    body,
    ctaLabel,
    ctaUrl,
}: {
    images: PromoImage[];
    heading: string;
    body: string;
    ctaLabel: string;
    ctaUrl: string;
}) {
    return (
        <div className="relative overflow-visible md:grid md:grid-cols-2 md:items-center md:gap-0 md:py-10 lg:py-14">
            <FloatingCollageMobile images={images} />

            <div
                className="relative z-10 hidden w-[120%] md:-ml-[10%] md:block md:justify-self-start"
                aria-hidden
            >
                <FloatingCollageDesktop images={images} />
            </div>

            <div className="mt-6 rounded-3xl bg-primary p-6 md:mt-0 md:p-10 md:py-12">
                <PromoBannerCopy
                    heading={heading}
                    body={body}
                    ctaLabel={ctaLabel}
                    ctaUrl={ctaUrl}
                />
            </div>
        </div>
    );
}

export function PromoBanner({promo}: {promo?: BlogPromo}) {
    const heading = promo?.heading?.trim() || FALLBACK.heading;
    const body = promo?.body?.trim() || FALLBACK.body;
    const ctaLabel = promo?.ctaLabel?.trim() || FALLBACK.ctaLabel;
    const ctaUrl = promo?.ctaUrl?.trim() || FALLBACK.ctaUrl;
    const images = (promo?.images ?? []).filter((img) => img?.url).slice(0, 3);

    if (images.length >= 1) {
        return (
            <PromoBannerFloating
                images={images}
                heading={heading}
                body={body}
                ctaLabel={ctaLabel}
                ctaUrl={ctaUrl}
            />
        );
    }

    return (
        <div className=" rounded-3xl bg-primary">
            <div className="flex flex-col items-center gap-6 p-6 md:flex-row md:items-center md:gap-10 md:p-10">
                <div className="flex shrink-0 justify-center" aria-hidden>
                    <PromoBannerImagePlaceholders />
                </div>

                <PromoBannerCopy
                    heading={heading}
                    body={body}
                    ctaLabel={ctaLabel}
                    ctaUrl={ctaUrl}
                />
            </div>
        </div>
    );
}
