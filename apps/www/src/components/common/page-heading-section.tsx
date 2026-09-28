import type {CSSProperties, ReactNode} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {ChevronDown} from 'lucide-react';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

import {InPageAnchorLink} from '@/components/common/in-page-anchor-link';
import {
    headingSettleClassName,
    headingSettleStyle,
} from '@/lib/ui/heading-settle';

export type PageHeadingCta = {
    label: string;
    href: string;
};

function isInPageHashHref(href: string): href is `#${string}` {
    return href.startsWith('#') && href.length > 1;
}

export type PageHeadingEyebrow =
    | {type: 'text'; content: ReactNode}
    | {
          type: 'image';
          src: string;
          alt: string;
          width?: number;
          height?: number;
      }
    | {
          type: 'video';
          src: string;
          poster?: string;
          width?: number;
          height?: number;
      }
    | {type: 'icon'; icon: ReactNode};

export type PageHeadingContentProps = {
    title: ReactNode;
    description?: ReactNode;
    /**
     * Text label (legacy ReactNode) or structured media/icon eyebrow.
     * Plain ReactNode keeps the uppercase muted text treatment.
     */
    eyebrow?: ReactNode | PageHeadingEyebrow;
    primaryCta?: PageHeadingCta;
    secondaryCta?: PageHeadingCta;
    /**
     * Visual order of CTAs. Default `primary-first`.
     * Use `secondary-first` when the secondary action should sit left
     * (e.g. solution hero: Get a quote ghost, then Explore primary).
     */
    ctaOrder?: 'primary-first' | 'secondary-first';
    /** Default `start` preserves catalog/page layouts; `center` for heroes. */
    align?: 'start' | 'center';
    variant?: 'default' | 'compact';
    /** Optional id on the H1 for section `aria-labelledby`. */
    titleId?: string;
    titleClassName?: string;
    descriptionClassName?: string;
    /**
     * Apple Mac–style fade + rise settle on eyebrow → title → description →
     * CTAs → children. CSS-only; keeps this module an RSC. Default off.
     */
    settle?: boolean;
    /** Starting stagger step when `settle` is true (100ms steps). Default 0. */
    settleOffset?: number;
    children?: ReactNode;
};

type PageHeadingSectionProps = PageHeadingContentProps & {
    /** Full-bleed dashed bottom rule on the dieline outer. Default true. */
    borderBottom?: boolean;
    className?: string;
    innerClassName?: string;
};

function isStructuredEyebrow(
    value: ReactNode | PageHeadingEyebrow,
): value is PageHeadingEyebrow {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return false;
    }
    if ('$$typeof' in value) {
        return false;
    }
    const kind = (value as {type?: unknown}).type;
    return (
        kind === 'text' ||
        kind === 'image' ||
        kind === 'video' ||
        kind === 'icon'
    );
}

function PageHeadingEyebrowSlot({
    eyebrow,
    align,
    className,
    style,
}: {
    eyebrow: ReactNode | PageHeadingEyebrow;
    align: 'start' | 'center';
    className?: string;
    style?: CSSProperties;
}) {
    const centered = align === 'center';

    if (!isStructuredEyebrow(eyebrow)) {
        return (
            <p
                className={cn(
                    'text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                    centered && 'text-center',
                    className,
                )}
                style={style}
            >
                {eyebrow}
            </p>
        );
    }

    switch (eyebrow.type) {
        case 'text':
            return (
                <p
                    className={cn(
                        'text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                        centered && 'text-center',
                        className,
                    )}
                    style={style}
                >
                    {eyebrow.content}
                </p>
            );
        case 'image': {
            const hasFixedSize =
                typeof eyebrow.width === 'number' &&
                typeof eyebrow.height === 'number';
            const width = eyebrow.width ?? 128;
            const height = eyebrow.height ?? 128;
            const isSvg = /\.svg(?:[?#]|$)/i.test(eyebrow.src);
            return (
                <div
                    className={cn(
                        'relative shrink-0 overflow-hidden',
                        !hasFixedSize && 'size-display-mark',
                        centered && 'mx-auto',
                        className,
                    )}
                    style={{
                        ...(hasFixedSize
                            ? {width: eyebrow.width, height: eyebrow.height}
                            : undefined),
                        ...style,
                    }}
                >
                    <Image
                        src={eyebrow.src}
                        alt={eyebrow.alt}
                        width={width}
                        height={height}
                        className="size-full object-contain"
                        priority
                        unoptimized={isSvg}
                    />
                </div>
            );
        }
        case 'video': {
            const hasFixedSize =
                typeof eyebrow.width === 'number' &&
                typeof eyebrow.height === 'number';
            return (
                <div
                    className={cn(
                        'relative shrink-0 overflow-hidden',
                        !hasFixedSize && 'size-display-mark',
                        centered && 'mx-auto',
                        className,
                    )}
                    style={{
                        ...(hasFixedSize
                            ? {width: eyebrow.width, height: eyebrow.height}
                            : undefined),
                        ...style,
                    }}
                >
                    <video
                        src={eyebrow.src}
                        poster={eyebrow.poster}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="size-full object-contain"
                        aria-label={eyebrow.poster ? undefined : 'Decorative video'}
                    />
                </div>
            );
        }
        case 'icon':
            return (
                <div
                    className={cn(
                        'flex size-10 shrink-0 items-center justify-center text-foreground [&_svg]:size-10',
                        centered && 'mx-auto',
                        className,
                    )}
                    style={style}
                >
                    {eyebrow.icon}
                </div>
            );
        default:
            return null;
    }
}

/** Heading stack without the dieline shell — for custom section composition. */
export function PageHeadingContent({
    title,
    description,
    eyebrow,
    primaryCta,
    secondaryCta,
    ctaOrder = 'primary-first',
    align = 'start',
    variant = 'default',
    titleId,
    titleClassName,
    descriptionClassName,
    settle = false,
    settleOffset = 0,
    children,
}: PageHeadingContentProps) {
    const isCompact = variant === 'compact';
    const centered = align === 'center';
    const hasCtas = Boolean(primaryCta || secondaryCta);
    const secondaryFirst = ctaOrder === 'secondary-first';
    const settleClass = headingSettleClassName(settle);

    let step = settleOffset;
    const nextSettleStyle = (): CSSProperties | undefined => {
        if (!settle) return undefined;
        const style = headingSettleStyle(step);
        step += 1;
        return style;
    };

    const primaryButton = primaryCta ? (
        <Button asChild size="xl" variant="default">
            {isInPageHashHref(primaryCta.href) ? (
                <InPageAnchorLink href={primaryCta.href}>
                    {primaryCta.label}
                </InPageAnchorLink>
            ) : (
                <Link href={primaryCta.href}>{primaryCta.label}</Link>
            )}
        </Button>
    ) : null;

    const secondaryButton = secondaryCta ? (
        <Button asChild size="xl" variant="link" className="gap-2">
            {isInPageHashHref(secondaryCta.href) ? (
                <InPageAnchorLink href={secondaryCta.href}>
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

    const eyebrowSettleStyle = eyebrow ? nextSettleStyle() : undefined;
    const titleSettleStyle = nextSettleStyle();
    const descriptionSettleStyle = description ? nextSettleStyle() : undefined;
    const ctaSettleStyle = hasCtas ? nextSettleStyle() : undefined;
    const childrenSettleStyle = children ? nextSettleStyle() : undefined;

    return (
        <div
            className={cn(
                'flex max-w-full flex-col gap-4',
                centered && 'items-center gap-7 text-center',
            )}
        >
            {eyebrow ? (
                <PageHeadingEyebrowSlot
                    eyebrow={eyebrow}
                    align={align}
                    className={settleClass}
                    style={eyebrowSettleStyle}
                />
            ) : null}
            <h1
                id={titleId}
                className={cn(
                    'font-medium tracking-tight text-foreground',
                    isCompact ? 'text-display' : 'text-display-lg',
                    titleClassName,
                    settleClass,
                )}
                style={titleSettleStyle}
            >
                {title}
            </h1>
            {description ? (
                <div
                    className={cn(
                        'text-muted-foreground',
                        isCompact
                            ? 'max-w-2xl text-lg leading-7'
                            : 'max-w-3xl text-xl leading-7',
                        descriptionClassName,
                        settleClass,
                    )}
                    style={descriptionSettleStyle}
                >
                    {description}
                </div>
            ) : null}
            {hasCtas ? (
                <div
                    className={cn(
                        'flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center',
                        centered && 'items-center justify-center',
                        settleClass,
                    )}
                    style={ctaSettleStyle}
                >
                    {secondaryFirst ? (
                        <>
                            {secondaryButton}
                            {primaryButton}
                        </>
                    ) : (
                        <>
                            {primaryButton}
                            {secondaryButton}
                        </>
                    )}
                </div>
            ) : null}
            {children ? (
                settle ? (
                    <div className={settleClass} style={childrenSettleStyle}>
                        {children}
                    </div>
                ) : (
                    children
                )
            ) : null}
        </div>
    );
}

export function PageHeadingSection({
    borderBottom = true,
    className,
    innerClassName,
    variant = 'default',
    ...contentProps
}: PageHeadingSectionProps) {
    return (
        <PageDielineSection
            borderBottom={borderBottom}
            paddingBlock="lg"
            className={className}
            innerClassName={innerClassName}
        >
            <PageHeadingContent variant={variant} {...contentProps} />
        </PageDielineSection>
    );
}

export type PageHeadingMedia = {
    src: string;
    alt: string;
    /** Intrinsic width hint for next/image. Default 640. */
    width?: number;
    /** Intrinsic height hint for next/image. Default 480. */
    height?: number;
};

type PageHeadingWithMediaProps = PageHeadingSectionProps & {
    /** Larger featured image beside the heading (catalogue / collection pages). */
    media?: PageHeadingMedia | null;
};

/**
 * Catalogue heading with optional featured media — keeps {@link PageHeadingSection}
 * free of layout changes for plain title/description pages (`/products`).
 */
export function PageHeadingWithMedia({
    media,
    borderBottom = true,
    className,
    innerClassName,
    variant = 'default',
    ...contentProps
}: PageHeadingWithMediaProps) {
    const hasMedia = Boolean(media?.src);

    return (
        <PageDielineSection
            borderBottom={borderBottom}
            paddingBlock="lg"
            className={className}
            innerClassName={innerClassName}
        >
            <div
                className={cn(
                    'flex flex-col gap-8',
                    hasMedia && 'lg:flex-row lg:items-start lg:justify-between lg:gap-12',
                )}
            >
                <div className={cn(hasMedia && 'min-w-0 flex-1')}>
                    <PageHeadingContent variant={variant} {...contentProps} />
                </div>
                {hasMedia && media ? (
                    <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg bg-muted lg:max-w-md lg:flex-1">
                        <Image
                            src={media.src}
                            alt={media.alt}
                            width={media.width ?? 640}
                            height={media.height ?? 480}
                            className="size-full object-cover"
                            sizes="(max-width: 1024px) 100vw, 448px"
                            priority
                        />
                    </div>
                ) : null}
            </div>
        </PageDielineSection>
    );
}
