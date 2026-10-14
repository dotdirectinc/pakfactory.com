import Link from 'next/link';
import {ArrowRight} from 'lucide-react';

import {NewsThumbnail} from '@/components/newsroom/news-thumbnail';
import {Icon} from '@/components/ui/icon';
import type {NewsCard} from '@/lib/newsroom/types';

/**
 * `/newsroom` list row (PROD-2913). Desktop: date column · 4:3 thumbnail +
 * title + summary · "Read more". Mobile: the date becomes an eyebrow above the
 * title and "Read more" sits under the summary.
 */
export function NewsListItem({item}: {item: NewsCard}) {
    return (
        <article className="grid grid-cols-1 gap-4 border-b border-dashed border-border py-8 md:grid-cols-[10rem_minmax(0,1fr)_auto] md:items-start md:gap-8">
            <time
                dateTime={item.publishedAt}
                className="hidden text-sm text-muted-foreground md:block"
            >
                {item.dateLabel}
            </time>

            <div className="flex min-w-0 items-start gap-4 sm:gap-6">
                <Link
                    href={item.href}
                    tabIndex={-1}
                    aria-hidden
                    className="w-28 shrink-0 sm:w-40"
                >
                    <NewsThumbnail
                        image={item.image}
                        aspectClassName="aspect-[4/3]"
                        sizes="(max-width: 640px) 112px, 160px"
                    />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <time
                        dateTime={item.publishedAt}
                        className="text-xs text-muted-foreground md:hidden"
                    >
                        {item.dateLabel}
                    </time>
                    <h3 className="text-lg font-semibold leading-snug tracking-tight text-foreground">
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
                    <Link
                        href={item.href}
                        className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-primary md:hidden"
                    >
                        Read more
                        <Icon icon={ArrowRight} />
                        <span className="sr-only">: {item.title}</span>
                    </Link>
                </div>
            </div>

            <Link
                href={item.href}
                className="hidden items-center gap-1 whitespace-nowrap text-sm font-semibold text-primary md:inline-flex"
            >
                Read more
                <Icon icon={ArrowRight} />
                <span className="sr-only">: {item.title}</span>
            </Link>
        </article>
    );
}
