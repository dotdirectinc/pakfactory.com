import Link from 'next/link';
import {
    PageDielineSection,
    type PageDielinePaddingBlock,
} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {NewsThumbnail} from '@/components/newsroom/news-thumbnail';
import {ArrowLink} from '@/components/ui/arrow-link';
import {SectionHeading} from '@/components/ui/section-heading';
import type {NewsCard} from '@/lib/newsroom/types';

export type PressReleasesRowProps = {
    id: string;
    heading: string;
    intro?: string;
    items: NewsCard[];
    /** "See all" link under the list; omit to hide. */
    cta?: {label: string; href: string};
    paddingBlock?: PageDielinePaddingBlock;
    borderTop?: boolean;
    borderBottom?: boolean;
};

function RelatedNewsItem({item}: {item: NewsCard}) {
    return (
        <article className="flex items-start gap-4 border-b border-dashed border-border py-8 sm:gap-8">
            <Link
                href={item.href}
                tabIndex={-1}
                aria-hidden
                className="w-28 shrink-0 sm:w-64"
            >
                <NewsThumbnail
                    image={item.image}
                    aspectClassName="aspect-video"
                    sizes="(max-width: 640px) 112px, 256px"
                />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                    {item.categoryLabel ? (
                        <>
                            <span className="font-semibold uppercase tracking-[0.08em] text-primary">
                                {item.categoryLabel}
                            </span>
                            <span aria-hidden>·</span>
                        </>
                    ) : null}
                    <time dateTime={item.publishedAt}>{item.dateLabel}</time>
                </div>
                <h3 className="text-lg font-medium leading-snug tracking-tight text-foreground sm:text-2xl">
                    <Link
                        href={item.href}
                        className="hover:underline hover:underline-offset-4"
                    >
                        {item.title}
                    </Link>
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <ArrowLink href={item.href} size="sm" srSuffix={item.title}>
                        Read more
                    </ArrowLink>
                    {item.readingMinutes ? (
                        <span className="text-sm text-muted-foreground">
                            {item.readingMinutes} min read
                        </span>
                    ) : null}
                </div>
            </div>
        </article>
    );
}

/**
 * "More announcements" (PROD-2918) — `pressReleasesRow` section. A left-aligned
 * list at the article's reading width rather than a card grid: a release reads
 * as a document, and the list keeps the same column as the body above it.
 */
export function PressReleasesRow({
    id,
    heading,
    intro,
    items,
    cta,
    paddingBlock = 'lg',
    borderTop = true,
    borderBottom = false,
}: PressReleasesRowProps) {
    if (items.length === 0) return null;

    return (
        <PageDielineSection
            paddingBlock={paddingBlock}
            borderTop={borderTop}
            borderBottom={borderBottom}
        >
            <section
                id={id}
                aria-label={heading}
                className="mx-auto flex max-w-3xl flex-col"
            >
                <SectionHeading
                    title={heading}
                    description={intro}
                    className="mb-4"
                />
                <ul className="flex flex-col">
                    {items.map((item, index) => (
                        <li
                            key={item.id}
                            className={cn(
                                index === items.length - 1 &&
                                    '[&>article]:border-b-0',
                            )}
                        >
                            <RelatedNewsItem item={item} />
                        </li>
                    ))}
                </ul>
                {cta ? (
                    <ArrowLink href={cta.href} className="mt-8 self-center">
                        {cta.label}
                    </ArrowLink>
                ) : null}
            </section>
        </PageDielineSection>
    );
}
