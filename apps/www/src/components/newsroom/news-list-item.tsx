import Link from 'next/link';

import {ArrowLink} from '@/components/ui/arrow-link';
import type {NewsCard} from '@/lib/newsroom/types';

/**
 * `/newsroom` list row (PROD-2913), per the newsroom mockup: date column ·
 * title + one-line summary · "Read more". Below `md` the three stack, date
 * first.
 */
export function NewsListItem({item}: {item: NewsCard}) {
    return (
        <article className="grid grid-cols-1 gap-2 border-b border-border py-6.5 md:grid-cols-[9.5rem_minmax(0,1fr)_auto] md:items-baseline md:gap-7">
            <time
                dateTime={item.publishedAt}
                className="text-sm text-muted-foreground"
            >
                {item.dateLabel}
            </time>
            <div className="flex min-w-0 flex-col gap-1">
                <h3 className="text-lg font-semibold leading-snug tracking-tight text-foreground">
                    <Link
                        href={item.href}
                        className="underline-offset-4 hover:underline"
                    >
                        {item.title}
                    </Link>
                </h3>
                {item.summary ? (
                    <p className="text-sm leading-6 text-muted-foreground">
                        {item.summary}
                    </p>
                ) : null}
            </div>
            <ArrowLink
                href={item.href}
                size="sm"
                icon="arrow"
                srSuffix={item.title}
                className="mt-1 md:mt-0"
            >
                Read more
            </ArrowLink>
        </article>
    );
}
