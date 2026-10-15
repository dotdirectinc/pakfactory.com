import {
    PortableText,
    type PortableTextComponents,
} from '@portabletext/react';
import type {PortableTextBlock} from '@portabletext/types';
import {cn} from '@pakfactory/ui/lib/utils';
import {externalLinkAttributes} from '@pakfactory/utilities/external-link';

import {SanityImage} from '@/components/ui/sanity-image';
import {resolveImageAlt, sanityImageBaseUrl} from '@/lib/sanity/image';
import {resolveWatermarkVariantFromLqip} from '@/lib/watermark-lqip-variant';

type BodyImageValue = {
    alt?: string;
    caption?: string;
    link?: string;
    applyWatermark?: boolean | null;
    lqip?: string | null;
    asset?: unknown;
};

type BodyQuoteValue = {quote?: string; attribution?: string};

type BodyCalloutValue = {
    calloutTone?: 'info' | 'tip' | 'warning' | 'success' | string;
    calloutTitle?: string;
    calloutBody?: PortableTextBlock[];
};

async function NewsBodyImage({
    value,
    titleFallback,
}: {
    value: BodyImageValue;
    titleFallback: string;
}) {
    const src = sanityImageBaseUrl(value.asset);
    if (!src) return null;
    const watermarkVariant = await resolveWatermarkVariantFromLqip(value.lqip);

    const image = (
        <SanityImage
            src={src}
            alt={resolveImageAlt(value, titleFallback)}
            applyWatermark={value.applyWatermark !== false}
            watermarkVariant={watermarkVariant}
            width={1200}
            height={675}
            sizes="(max-width: 768px) 100vw, 768px"
            className="h-auto w-full rounded-xl object-cover"
        />
    );

    return (
        <figure className="my-8">
            {value.link ? (
                <a href={value.link} {...externalLinkAttributes(value.link)}>
                    {image}
                </a>
            ) : (
                image
            )}
            {value.caption ? (
                <figcaption className="mt-2 text-xs text-muted-foreground">
                    {value.caption}
                </figcaption>
            ) : null}
        </figure>
    );
}

const LINK_MARKS: PortableTextComponents['marks'] = {
    link: ({value, children}) => {
        const href: string = value?.href ?? '';
        if (!href) return <>{children}</>;
        return (
            <a
                href={href}
                className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
                {...externalLinkAttributes(href)}
            >
                {children}
            </a>
        );
    },
};

const CALLOUT_COMPONENTS: PortableTextComponents = {
    block: {
        normal: ({children}) => <p className="leading-7">{children}</p>,
    },
    marks: LINK_MARKS,
};

function firstParagraphKey(blocks: PortableTextBlock[]): string | undefined {
    const first = blocks.find(
        (block) =>
            block._type === 'block' &&
            (block.style ?? 'normal') === 'normal' &&
            !('listItem' in block && block.listItem),
    );
    return first?._key;
}

function makeComponents({
    titleFallback,
    leadKey,
    dateline,
}: {
    titleFallback: string;
    leadKey: string | undefined;
    /** "MARKHAM, ON, September 15, 2026" — bolded into the first paragraph. */
    dateline: string;
}): PortableTextComponents {
    return {
        block: {
            normal: ({children, value}) =>
                value._key && value._key === leadKey ? (
                    <p className="mb-8 leading-7 text-muted-foreground">
                        <span className="font-semibold text-foreground">
                            {dateline}
                        </span>{' '}
                        — {children}
                    </p>
                ) : (
                    <p className="mb-8 leading-7 text-muted-foreground">
                        {children}
                    </p>
                ),
            h2: ({children}) => (
                <h2 className="mb-4 mt-10 text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
                    {children}
                </h2>
            ),
            h3: ({children}) => (
                <h3 className="mb-3 mt-8 text-xl font-semibold tracking-tight text-foreground">
                    {children}
                </h3>
            ),
            blockquote: ({children}) => (
                <blockquote className="my-6 border-l-2 border-primary/40 pl-4 italic text-muted-foreground">
                    {children}
                </blockquote>
            ),
        },
        list: {
            bullet: ({children}) => (
                <ul className="mb-8 list-disc space-y-2 pl-5 leading-7 text-muted-foreground">
                    {children}
                </ul>
            ),
            number: ({children}) => (
                <ol className="mb-8 list-decimal space-y-2 pl-5 leading-7 text-muted-foreground">
                    {children}
                </ol>
            ),
        },
        marks: {
            ...LINK_MARKS,
            strong: ({children}) => (
                <strong className="font-semibold text-foreground">
                    {children}
                </strong>
            ),
        },
        types: {
            bodyImage: ({value}) => (
                <NewsBodyImage
                    value={value as BodyImageValue}
                    titleFallback={titleFallback}
                />
            ),
            bodyQuote: ({value}) => {
                const {quote, attribution} = value as BodyQuoteValue;
                if (!quote?.trim()) return null;
                return (
                    <blockquote className="my-6 border-l-2 border-primary/40 pl-4 italic text-muted-foreground">
                        <p className="mb-2 leading-7">“{quote.trim()}”</p>
                        {attribution?.trim() ? (
                            <cite className="text-sm not-italic">
                                — {attribution.trim()}
                            </cite>
                        ) : null}
                    </blockquote>
                );
            },
            bodyCallout: ({value}) => {
                const {calloutTitle, calloutBody} = value as BodyCalloutValue;
                if (!calloutTitle && !calloutBody?.length) return null;
                return (
                    <aside className="my-8 flex flex-col gap-2 rounded-xl border border-border bg-muted/50 p-6 text-base text-foreground">
                        {calloutTitle ? (
                            <p className="font-semibold">{calloutTitle}</p>
                        ) : null}
                        {calloutBody?.length ? (
                            <PortableText
                                value={calloutBody}
                                components={CALLOUT_COMPONENTS}
                            />
                        ) : null}
                    </aside>
                );
            },
        },
    };
}

type NewsPortableTextProps = {
    value: PortableTextBlock[];
    /** Dateline lead-in for the first paragraph, already formatted. */
    dateline: string;
    /** Release title — tier-3 image alt fallback. */
    titleFallback: string;
    className?: string;
};

/**
 * Press release body (PROD-2918). Serializers ported from the blog's
 * `PostPortableText` with www tokens. The first paragraph opens with the bold
 * dateline ("MARKHAM, ON, September 15, 2026 —"), as wire copy does.
 *
 * Supported inline blocks: `bodyImage`, `bodyQuote`, `bodyCallout`. The rest of
 * the blog inline set (gallery, video, stat stack, chart, table, embed) renders
 * nothing here yet — see the PR's known gaps.
 */
export function NewsPortableText({
    value,
    dateline,
    titleFallback,
    className,
}: NewsPortableTextProps) {
    if (value.length === 0) return null;
    const components = makeComponents({
        titleFallback,
        leadKey: firstParagraphKey(value),
        dateline,
    });
    return (
        <div className={cn('text-lg', className)}>
            <PortableText
                value={value}
                components={components}
                onMissingComponent={false}
            />
        </div>
    );
}
