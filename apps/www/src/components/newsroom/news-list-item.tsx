import Link from 'next/link';

import {NewsThumbnail} from '@/components/newsroom/news-thumbnail';
import {ArrowLink} from '@/components/ui/arrow-link';
import type {NewsCard} from '@/lib/newsroom/types';

/**
 * `/newsroom` list row (PROD-2913), per `2026-10-13_newsroom-design_2.html`:
 * date column · 4:3 thumbnail + title + summary · "Read more", dashed rule
 * below. Below `md` the date becomes an eyebrow over the title and "Read
 * more" moves under the summary.
 */
export function NewsListItem({item}: {item: NewsCard}) {
    const readMore = (className: string) => (
        <ArrowLink
            href={item.href}
            size="sm"
            srSuffix={item.title}
            className={className}
        >
            Read more
        </ArrowLink>
    );

    return (
        <article className="grid gap-0 border-b border-dashed border-border py-8 md:grid-cols-[10rem_minmax(0,1fr)_auto] md:items-start md:gap-8">
            <time
                dateTime={item.publishedAt}
                className="hidden text-sm text-muted-foreground md:block"
            >
                {item.dateLabel}
            </time>
            <div className="flex items-start gap-4 sm:gap-6">
                <Link
                    href={item.href}
                    tabIndex={-1}
                    aria-hidden
                    className="w-24 shrink-0 sm:w-32"
                >
                    <NewsThumbnail
                        image={item.image}
                        aspectClassName="aspect-[4/3]"
                        sizes="128px"
                    />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <time
                        dateTime={item.publishedAt}
                        className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:hidden"
                    >
                        {item.dateLabel}
                    </time>
                    <h3 className="text-xl font-medium leading-snug tracking-tight text-foreground">
                        <Link
                            href={item.href}
                            className="hover:underline hover:underline-offset-4"
                        >
                            {item.title}
                        </Link>
                    </h3>
                    {item.summary ? (
                        <p className="text-sm leading-6 text-muted-foreground">
                            {item.summary}
                        </p>
                    ) : null}
                    {readMore('mt-1 md:hidden')}
                </div>
            </div>
            {readMore('hidden md:inline-flex')}
        </article>
    );
}
