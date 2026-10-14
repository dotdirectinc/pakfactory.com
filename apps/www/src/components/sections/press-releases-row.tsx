import Link from 'next/link';
import {ChevronRight} from 'lucide-react';
import {
    PageDielineSection,
    type PageDielinePaddingBlock,
} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {NewsThumbnail} from '@/components/newsroom/news-thumbnail';
import {Icon} from '@/components/ui/icon';
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
                <Link
                    href={item.href}
                    className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-primary"
                >
                    Read more
                    {item.readingMinutes ? (
                        <span className="font-normal text-muted-foreground">
                            ({item.readingMinutes} min read)
                        </span>
                    ) : null}
                    <Icon icon={ChevronRight} />
                    <span className="sr-only">: {item.title}</span>
                </Link>
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
    const headingId = `${id}-heading`;

    return (
        <PageDielineSection
            paddingBlock={paddingBlock}
            borderTop={borderTop}
            borderBottom={borderBottom}
        >
            <section
                id={id}
                aria-labelledby={headingId}
                className="mx-auto flex max-w-3xl flex-col"
            >
                <h2
                    id={headingId}
                    className="mb-4 text-3xl font-semibold leading-tight tracking-tight text-foreground"
                >
                    {heading}
                </h2>
                {intro ? (
                    <p className="text-base text-muted-foreground">{intro}</p>
                ) : null}
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
                    <Link
                        href={cta.href}
                        className="mt-8 inline-flex items-center gap-1 self-center text-base font-semibold text-primary"
                    >
                        {cta.label}
                        <Icon icon={ChevronRight} />
                    </Link>
                ) : null}
            </section>
        </PageDielineSection>
    );
}
