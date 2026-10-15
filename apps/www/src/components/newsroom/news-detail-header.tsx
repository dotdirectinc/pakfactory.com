import Link from 'next/link';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';

import {SanityImage} from '@/components/ui/sanity-image';
import {ShareButtons} from '@/components/ui/share-buttons';
import {VideoFacade} from '@/components/ui/video-facade';
import type {NewsHeroMedia, NewsItem} from '@/lib/newsroom/types';
import {WWW_ROUTES} from '@/lib/www-routes';

function HeroFigure({
    hero,
    caption,
    title,
}: {
    hero: NewsHeroMedia;
    caption: string | null;
    title: string;
}) {
    const media =
        hero.kind === 'image' ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted">
                <SanityImage
                    src={hero.src}
                    alt={hero.alt}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 768px"
                    className="object-cover"
                    style={
                        hero.objectPosition
                            ? {objectPosition: hero.objectPosition}
                            : undefined
                    }
                />
            </div>
        ) : (
            // Same click-to-play inline player as the case-study hero.
            <VideoFacade
                videoUrl={hero.videoUrl}
                thumbnailUrl={hero.thumbnailSrc}
                title={title}
                sizes="(max-width: 768px) 100vw, 768px"
                priority
            />
        );

    return (
        <figure className="flex flex-col gap-2">
            {media}
            {caption ? (
                <figcaption className="text-xs text-muted-foreground">
                    {caption}
                </figcaption>
            ) : null}
        </figure>
    );
}

/**
 * Release header (PROD-2918): category eyebrow, H1, summary, date, share
 * buttons, feature image + caption. No read time (removed per review,
 * 2026-10-14). Pattern: blog `PostDetailHeader`, www tokens.
 */
export function NewsDetailHeader({
    item,
    shareUrl,
}: {
    item: NewsItem;
    /** Absolute canonical URL for the share buttons. */
    shareUrl: string;
}) {
    return (
        <PageDielineSection
            as="header"
            paddingBlock="none"
            innerClassName="pt-16 sm:pt-20 lg:pt-24"
        >
            <div className="mx-auto flex max-w-3xl flex-col gap-6">
                <div className="flex flex-col gap-4">
                    {item.category && item.categoryLabel ? (
                        <Link
                            href={WWW_ROUTES.newsroom}
                            className="w-fit text-xs font-semibold uppercase tracking-[0.08em] text-primary hover:text-primary/80"
                        >
                            {item.categoryLabel}
                        </Link>
                    ) : null}
                    <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground lg:text-5xl">
                        {item.title}
                    </h1>
                    {item.summary ? (
                        <p className="text-lg leading-7 text-muted-foreground">
                            {item.summary}
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-y border-dashed border-border py-4">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-muted-foreground">
                        <time dateTime={item.publishedAt}>{item.dateLabel}</time>
                        {item.lastModified && item.lastModifiedLabel ? (
                            <>
                                <span aria-hidden>·</span>
                                <span>
                                    Updated{' '}
                                    <time dateTime={item.lastModified}>
                                        {item.lastModifiedLabel}
                                    </time>
                                </span>
                            </>
                        ) : null}
                    </p>
                    <ShareButtons url={shareUrl} title={item.title} />
                </div>

                {item.hero ? (
                    <HeroFigure
                        hero={item.hero}
                        caption={item.imageCaption}
                        title={item.title}
                    />
                ) : null}
            </div>
        </PageDielineSection>
    );
}
