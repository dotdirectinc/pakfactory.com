import type {ReactNode} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

export type PageHeadingCta = {
    label: string;
    href: string;
};

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
    children?: ReactNode;
};

type PageHeadingSectionProps = PageHeadingContentProps & {
    /** Full-bleed dashed bottom rule on the dieline outer. Default false. */
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
}: {
    eyebrow: ReactNode | PageHeadingEyebrow;
    align: 'start' | 'center';
}) {
    const centered = align === 'center';

    if (!isStructuredEyebrow(eyebrow)) {
        return (
            <p
                className={cn(
                    'text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                    centered && 'text-center',
                )}
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
                    )}
                >
                    {eyebrow.content}
                </p>
            );
        case 'image': {
            const width = eyebrow.width ?? 128;
            const height = eyebrow.height ?? 128;
            const isSvg = /\.svg(?:[?#]|$)/i.test(eyebrow.src);
            return (
                <div
                    className={cn(
                        'relative shrink-0 overflow-hidden',
                        centered && 'mx-auto',
                    )}
                    style={{width, height}}
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
            const width = eyebrow.width ?? 128;
            const height = eyebrow.height ?? 128;
            return (
                <div
                    className={cn(
                        'relative shrink-0 overflow-hidden',
                        centered && 'mx-auto',
                    )}
                    style={{width, height}}
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
                    )}
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
    children,
}: PageHeadingContentProps) {
    const isCompact = variant === 'compact';
    const centered = align === 'center';
    const hasCtas = Boolean(primaryCta || secondaryCta);
    const secondaryFirst = ctaOrder === 'secondary-first';

    const primaryButton = primaryCta ? (
        <Button asChild size="xl" variant="default">
            <Link href={primaryCta.href}>{primaryCta.label}</Link>
        </Button>
    ) : null;

    const secondaryButton = secondaryCta ? (
        <Button asChild size="xl" variant="ghost">
            <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
        </Button>
    ) : null;

    return (
        <div
            className={cn(
                'flex max-w-full flex-col gap-4',
                centered && 'items-center gap-7 text-center',
            )}
        >
            {eyebrow ? (
                <PageHeadingEyebrowSlot eyebrow={eyebrow} align={align} />
            ) : null}
            <h1
                id={titleId}
                className={cn(
                    'font-medium leading-none tracking-tight text-foreground',
                    isCompact
                        ? 'text-[clamp(2rem,5vw,3rem)]'
                        : 'text-[clamp(2.5rem,6vw,4.5rem)]',
                    titleClassName,
                )}
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
                    )}
                >
                    {description}
                </div>
            ) : null}
            {hasCtas ? (
                <div
                    className={cn(
                        'flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center',
                        centered && 'items-center justify-center',
                    )}
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
            {children}
        </div>
    );
}

export function PageHeadingSection({
    borderBottom = false,
    className,
    innerClassName,
    variant = 'default',
    ...contentProps
}: PageHeadingSectionProps) {
    const isCompact = variant === 'compact';

    return (
        <PageDielineSection
            borderBottom={borderBottom}
            className={className}
            innerClassName={cn(
                'border-border pb-12 pt-24',
                isCompact && 'pb-8',
                innerClassName,
            )}
        >
            <PageHeadingContent variant={variant} {...contentProps} />
        </PageDielineSection>
    );
}
