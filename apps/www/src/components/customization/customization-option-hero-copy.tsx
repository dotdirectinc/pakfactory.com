'use client';

import {
    PortableText,
    type PortableTextComponents,
} from '@portabletext/react';
import type {PortableTextBlock} from '@portabletext/types';
import {externalLinkAttributes} from '@pakfactory/utilities/external-link';
import {SanityImage} from '@/components/ui/sanity-image';
import {resolveOptionAliases} from '@/lib/catalog/option-aliases';
import type {CustomizationDetail} from '@/lib/catalog/types';
import {resolveImageAlt, sanityImageBaseUrl} from '@/lib/sanity/image';

const heroProseComponents: PortableTextComponents = {
    block: {
        normal: ({children}) => (
            <p className="mb-3 text-base leading-relaxed text-muted-foreground last:mb-0">
                {children}
            </p>
        ),
    },
    list: {
        bullet: ({children}) => (
            <ul className="mb-3 list-disc space-y-2 pl-5 text-base leading-relaxed text-muted-foreground last:mb-0">
                {children}
            </ul>
        ),
        number: ({children}) => (
            <ol className="mb-3 list-decimal space-y-2 pl-5 text-base leading-relaxed text-muted-foreground last:mb-0">
                {children}
            </ol>
        ),
    },
    listItem: {
        bullet: ({children}) => <li>{children}</li>,
        number: ({children}) => <li>{children}</li>,
    },
    marks: {
        strong: ({children}) => (
            <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({children}) => <em>{children}</em>,
        link: ({value, children}) => {
            const href: string = value?.href ?? '#';
            return (
                <a
                    href={href}
                    className="font-medium text-primary underline underline-offset-4 hover:no-underline"
                    {...externalLinkAttributes(href)}
                >
                    {children}
                </a>
            );
        },
    },
};

function OptionBodyImage({
    value,
    titleFallback,
}: {
    // Studio bodyImage — shape from Sanity, not fully typed in www.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
    titleFallback: string;
}) {
    if (!value?.asset) return null;
    const src = sanityImageBaseUrl(value.asset);
    if (!src) return null;
    const caption =
        typeof value.caption === 'string' ? value.caption.trim() : '';

    return (
        <figure className="not-prose my-6 w-full">
            <div className="relative aspect-video overflow-hidden rounded-[var(--radius-control)]">
                <SanityImage
                    src={src}
                    alt={resolveImageAlt(value, titleFallback)}
                    applyWatermark={value.applyWatermark !== false}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 640px"
                />
            </div>
            {caption ? (
                <figcaption className="mt-2 text-center text-sm text-muted-foreground">
                    {caption}
                </figcaption>
            ) : null}
        </figure>
    );
}

function bodyProseComponents(titleFallback: string): PortableTextComponents {
    return {
        ...heroProseComponents,
        types: {
            bodyImage: ({value}) => (
                <OptionBodyImage value={value} titleFallback={titleFallback} />
            ),
        },
        block: {
            ...heroProseComponents.block,
            h2: ({children}) => (
                <h2 className="mb-3 mt-6 text-xl font-semibold tracking-tight text-foreground first:mt-0">
                    {children}
                </h2>
            ),
            h3: ({children}) => (
                <h3 className="mb-2 mt-5 text-lg font-semibold tracking-tight text-foreground">
                    {children}
                </h3>
            ),
            normal: ({children}) => (
                <p className="mb-3 text-base leading-relaxed text-muted-foreground last:mb-0">
                    {children}
                </p>
            ),
        },
    };
}

/**
 * PROD-3207 — CDP hero copy under the H1: option Description PT, optional
 * alias line, optional Body. Shared by learn-first and standard overviews.
 */
export function CustomizationOptionHeroCopy({
    detail,
}: {
    detail: Pick<
        CustomizationDetail,
        | 'title'
        | 'descriptionBlocks'
        | 'body'
        | 'alsoKnownAs'
        | 'conceptAliases'
        | 'inheritAliasesFromConcept'
    >;
}) {
    const aliases = resolveOptionAliases(detail);
    const descriptionBlocks = detail.descriptionBlocks;
    const body = detail.body;

    if (
        !descriptionBlocks?.length &&
        aliases.length === 0 &&
        !body?.length
    ) {
        return null;
    }

    return (
        <div className="mt-4 flex flex-col gap-4">
            {descriptionBlocks?.length ? (
                <div className="text-base">
                    <PortableText
                        value={descriptionBlocks as PortableTextBlock[]}
                        components={heroProseComponents}
                    />
                </div>
            ) : null}
            {aliases.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                        Also known as:
                    </span>{' '}
                    {aliases.join(', ')}
                </p>
            ) : null}
            {body?.length ? (
                <div className="text-base">
                    <PortableText
                        value={body as PortableTextBlock[]}
                        components={bodyProseComponents(detail.title)}
                    />
                </div>
            ) : null}
        </div>
    );
}
