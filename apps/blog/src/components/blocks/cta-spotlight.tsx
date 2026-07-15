import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';
import type {CtaSpotlightBlock, BlockProps} from '@/components/blocks/registry';
import {PageDielineFullBleedSection} from '@/components/layout/page-dieline-section';
import {SanityImage} from '@/components/ui/sanity-image';
import {
    CTA_SPOTLIGHT_DIELINE_BORDER_DEFAULTS,
    resolveDielineBorders,
} from '@/lib/dieline-borders';
import {resolveFooterLinkHref} from '@/lib/blog-footer-nav';
import {sanityImageAlt, sanityImageBaseUrl} from '@/lib/sanity-image';
import {externalLinkAttributes} from '@/lib/external-link';

const DEFAULT_HEADING = "Let's skip the chatter and start building!";
const DEFAULT_BODY =
    'With a variety of unique blocks, you can effortlessly create a page without any coding.';
const DEFAULT_CTA_LABEL = 'Get started';
const DEFAULT_CTA_HREF = '/';

const CARD_BUTTON = 'bg-background text-foreground hover:bg-background/90';

/** Dieline horizontal rules must live on a tall box — empty 0-height
 *  dividers clip Pak’s background-image dash pattern (globals.css). Use
 *  `border-y` when both edges share a width mode so top/bottom don’t clobber. */
function dielineEdgeClass(top: boolean, bottom: boolean) {
    if (top && bottom) return 'border-y border-dashed border-border';
    if (top) return 'border-t border-dashed border-border';
    if (bottom) return 'border-b border-dashed border-border';
    return undefined;
}

/**
 * `ctaSpotlight` page-builder block — CTA card with heading, body, button, and
 * a single image. The image renders either contained (clipped inside the card)
 * or floating (breaking out of the card edge). Optional Studio color picker
 * sets the card background; defaults to brand green when empty.
 */
export function CtaSpotlight({
    heading,
    body,
    ctaLabel,
    linkType,
    externalUrl,
    internalLink,
    imageEffect,
    backgroundColor,
    image,
    showTopBorder,
    showBottomBorder,
    topBorderWidth,
    bottomBorderWidth,
}: BlockProps<CtaSpotlightBlock>) {
    const {borderTop, borderBottom} = resolveDielineBorders(
        showTopBorder,
        showBottomBorder,
        CTA_SPOTLIGHT_DIELINE_BORDER_DEFAULTS,
    );

    // Default to max width when the field is absent (legacy docs).
    const topFull = topBorderWidth === 'full';
    const bottomFull = bottomBorderWidth === 'full';

    const fullTop = borderTop && topFull;
    const fullBottom = borderBottom && bottomFull;
    const maxTop = borderTop && !topFull;
    const maxBottom = borderBottom && !bottomFull;

    const hex = backgroundColor?.trim() || undefined;
    const isFloating = imageEffect === 'floating';

    const imageUrl = sanityImageBaseUrl(image);
    const imageAlt = sanityImageAlt(image) ?? '';
    const resolved = resolveFooterLinkHref({
        linkType,
        externalUrl,
        internalLink,
        label: ctaLabel,
    });
    const href = resolved?.href ?? DEFAULT_CTA_HREF;

    return (
        <PageDielineFullBleedSection
            aria-labelledby="cta-spotlight-heading"
            borderX={false}
            // Drive dashes via className so we can use border-y when needed.
            borderTop={false}
            borderBottom={false}
            sectionClassName={dielineEdgeClass(fullTop, fullBottom)}
            innerClassName={cn(
                'py-16 lg:py-32',
                isFloating && 'overflow-visible',
                dielineEdgeClass(maxTop, maxBottom),
            )}
        >
            <div
                className={cn(
                    'rounded-3xl',
                    hex
                        ? 'text-white'
                        : 'bg-primary text-primary-foreground',
                    isFloating ? 'overflow-visible' : 'overflow-hidden',
                )}
                style={hex ? {backgroundColor: hex} : undefined}
            >
                <div
                    className={cn(
                        'grid items-center gap-8 p-6 md:grid-cols-2 md:gap-12 md:p-10 md:py-12',
                        isFloating && 'overflow-visible',
                    )}
                >
                    {imageUrl ? (
                        isFloating ? (
                            <div className="relative order-first h-56 w-full overflow-visible ">
                                <div className="absolute inset-0 md:-inset-x-4 md:-inset-y-16 lg:-inset-y-24">
                                    <SanityImage
                                        src={imageUrl}
                                        alt={imageAlt}
                                        fill
                                        className="object-contain object-center md:scale-110"
                                        sizes="(min-width: 768px) 45vw, 100vw"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="relative order-first h-56 w-full overflow-hidden rounded-2xl md:h-72">
                                <SanityImage
                                    src={imageUrl}
                                    alt={imageAlt}
                                    fill
                                    className="object-cover"
                                    sizes="(min-width: 768px) 45vw, 100vw"
                                />
                            </div>
                        )
                    ) : (
                        <div
                            className="order-first h-56 w-full rounded-2xl bg-current/10 md:h-72"
                            aria-hidden
                        />
                    )}

                    <div className="flex flex-col gap-4">
                        <h2
                            id="cta-spotlight-heading"
                            className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl"
                        >
                            {heading?.trim() || DEFAULT_HEADING}
                        </h2>
                        <p className="max-w-[520px] text-lg leading-7 md:text-xl">
                            {body?.trim() || DEFAULT_BODY}
                        </p>
                        <Button
                            asChild
                            className={cn(
                                'mt-1 w-fit gap-2 rounded-[10px] px-6 text-base font-medium',
                                CARD_BUTTON,
                            )}
                        >
                            <Link
                                href={href}
                                {...externalLinkAttributes(href)}
                            >
                                {ctaLabel?.trim() || DEFAULT_CTA_LABEL}
                                <ArrowRight
                                    className="size-4"
                                    aria-hidden
                                />
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </PageDielineFullBleedSection>
    );
}
