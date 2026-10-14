import type {PortableTextBlock} from '@portabletext/types';
import type {
    PressReleaseCardDoc,
    PressReleaseCardImageDoc,
    PressReleaseDetailDoc,
} from '@pakfactory/sanity/queries';

import {sanityImageBaseUrl} from '@/lib/sanity/image';
import {newsItemHref} from '@/lib/www-routes';
import {getYouTubeId} from '@/lib/youtube';
import {
    NEWS_CATEGORIES,
    type NewsCard,
    type NewsCategory,
    type NewsHeroMedia,
    type NewsImage,
    type NewsItem,
} from '@/lib/newsroom/types';

/** Studio list titles for `pressRelease.category`. */
const CATEGORY_LABELS: Record<NewsCategory, string> = {
    partnership: 'Partnership',
    product: 'Product & capability',
    award: 'Award & recognition',
    leadership: 'Leadership',
    sustainability: 'Sustainability',
    milestone: 'Company milestone',
    facility: 'Facility & network',
};

/**
 * Releases are issued from Markham, so dates and the year filter use Toronto
 * time. A UTC render would put a release issued at 9 pm on Dec 31 into the next
 * year.
 */
const NEWS_TIME_ZONE = 'America/Toronto';

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
    timeZone: NEWS_TIME_ZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
});

const YEAR_FORMAT = new Intl.DateTimeFormat('en-US', {
    timeZone: NEWS_TIME_ZONE,
    year: 'numeric',
});

export function newsCategoryLabel(category: NewsCategory): string {
    return CATEGORY_LABELS[category];
}

function asCategory(value: string | null | undefined): NewsCategory | null {
    return NEWS_CATEGORIES.includes(value as NewsCategory)
        ? (value as NewsCategory)
        : null;
}

function validDate(iso: string | null | undefined): Date | null {
    if (!iso) return null;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function formatNewsDate(date: Date): string {
    return DATE_FORMAT.format(date);
}

function hotspotPosition(
    hotspot: {x?: number | null; y?: number | null} | null | undefined,
): string | undefined {
    const x = hotspot?.x;
    const y = hotspot?.y;
    if (typeof x !== 'number' || typeof y !== 'number') return undefined;
    return `${Math.round(x * 100)}% ${Math.round(y * 100)}%`;
}

function youtubeThumbnail(videoUrl: string | null | undefined): string | null {
    const id = videoUrl ? getYouTubeId(videoUrl) : null;
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

function mapCardImage(
    image: PressReleaseCardImageDoc | null | undefined,
    videoUrl: string | null | undefined,
    title: string,
): NewsImage | null {
    const src = sanityImageBaseUrl(image?.url) ?? youtubeThumbnail(videoUrl);
    if (!src) return null;
    return {
        src,
        alt: image?.alt?.trim() || title,
        objectPosition: hotspotPosition(image?.hotspot),
    };
}

/** Sanity card → `NewsCard`; null when a required field is missing. */
export function mapNewsCard(doc: PressReleaseCardDoc): NewsCard | null {
    const title = doc.title?.trim();
    const slug = doc.slug?.trim();
    const published = validDate(doc.publishedAt);
    if (!title || !slug || !published || !doc.publishedAt) return null;

    const category = asCategory(doc.category);
    return {
        id: doc._id,
        title,
        slug,
        href: newsItemHref(slug),
        summary: doc.summary?.trim() ?? '',
        category,
        categoryLabel: category ? CATEGORY_LABELS[category] : null,
        publishedAt: doc.publishedAt,
        dateLabel: formatNewsDate(published),
        year: YEAR_FORMAT.format(published),
        image: mapCardImage(doc.image, doc.videoUrl, title),
    };
}

export function mapNewsCards(
    docs: readonly PressReleaseCardDoc[] | null | undefined,
): NewsCard[] {
    return (docs ?? [])
        .map(mapNewsCard)
        .filter((card): card is NewsCard => card != null);
}

function mapHero(
    hero: PressReleaseDetailDoc['heroMedia'],
    title: string,
): NewsHeroMedia | null {
    if (!hero) return null;
    if (hero.mediaType === 'video') {
        const videoUrl = hero.videoUrl?.trim();
        if (!videoUrl) return null;
        return {
            kind: 'video',
            videoUrl,
            thumbnailSrc:
                sanityImageBaseUrl(hero.videoThumbnailUrl) ??
                youtubeThumbnail(videoUrl),
        };
    }
    const src = sanityImageBaseUrl(hero.imageUrl);
    if (!src) return null;
    return {
        kind: 'image',
        src,
        alt: hero.alt?.trim() || title,
        width: hero.imageWidth ?? undefined,
        height: hero.imageHeight ?? undefined,
        objectPosition: hotspotPosition(hero.imageHotspot),
    };
}

/** Sanity detail → `NewsItem`; null when the release cannot render. */
export function mapNewsItem(doc: PressReleaseDetailDoc): NewsItem | null {
    const card = mapNewsCard({
        _id: doc._id,
        title: doc.title,
        slug: doc.slug,
        summary: doc.summary,
        category: doc.category,
        publishedAt: doc.publishedAt,
        videoUrl: doc.heroMedia?.mediaType === 'video' ? doc.heroMedia.videoUrl : null,
        image:
            doc.heroMedia?.mediaType === 'video'
                ? {url: doc.heroMedia.videoThumbnailUrl}
                : {
                      url: doc.heroMedia?.imageUrl,
                      hotspot: doc.heroMedia?.imageHotspot,
                      alt: doc.heroMedia?.alt,
                  },
    });
    if (!card) return null;

    const modified = validDate(doc.lastModified);
    return {
        ...card,
        dateline: doc.dateline?.trim() || 'Markham, ON',
        lastModified: modified ? doc.lastModified ?? null : null,
        lastModifiedLabel: modified ? formatNewsDate(modified) : null,
        hero: mapHero(doc.heroMedia, card.title),
        imageCaption: doc.imageCaption?.trim() || null,
        body: (doc.body ?? []) as PortableTextBlock[],
        seo: {
            metaTitle: doc.metaTitle?.trim() || null,
            metaDescription: doc.metaDescription?.trim() || null,
            canonicalUrl: doc.canonicalUrl?.trim() || null,
            allowIndex: doc.allowIndex !== false,
            allowFollow: doc.allowFollow !== false,
            noImageIndex: doc.noImageIndex === true,
            ogTitle: doc.ogTitle?.trim() || null,
            ogDescription: doc.ogDescription?.trim() || null,
            ogImageUrl: doc.ogImageUrl?.trim() || null,
        },
        sections: doc.layout?.sections ?? [],
    };
}
