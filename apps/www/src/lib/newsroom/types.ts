import type {PortableTextBlock} from '@portabletext/types';
import type {PageSectionDoc} from '@pakfactory/sanity/queries';

/** `pressRelease.category` values (Studio list, PROD-2909). */
export const NEWS_CATEGORIES = [
    'partnership',
    'product',
    'award',
    'leadership',
    'sustainability',
    'milestone',
    'facility',
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

/** Card / list image — CDN base URL plus the Studio hotspot as `object-position`. */
export type NewsImage = {
    src: string;
    alt: string;
    /** CSS `object-position` from the hotspot, e.g. `40% 30%`. */
    objectPosition?: string;
};

/** One release as a list row, grid tile, or "More announcements" row. */
export type NewsCard = {
    id: string;
    title: string;
    slug: string;
    href: string;
    summary: string;
    category: NewsCategory | null;
    /** Display label for `category` ("Partnership", …). */
    categoryLabel: string | null;
    /** ISO date-time. */
    publishedAt: string;
    /** Display date, e.g. "September 15, 2026" (Toronto). */
    dateLabel: string;
    /** Calendar year in Toronto — the listing's year filter. */
    year: string;
    image: NewsImage | null;
};

export type NewsHeroMedia =
    | {
          kind: 'image';
          src: string;
          alt: string;
          width?: number;
          height?: number;
          objectPosition?: string;
      }
    | {
          kind: 'video';
          videoUrl: string;
          thumbnailSrc: string | null;
      };

export type NewsSeo = {
    metaTitle: string | null;
    metaDescription: string | null;
    canonicalUrl: string | null;
    allowIndex: boolean;
    allowFollow: boolean;
    noImageIndex: boolean;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImageUrl: string | null;
};

/** A full release for `/newsroom/[slug]`. */
export type NewsItem = NewsCard & {
    dateline: string;
    /** ISO; set only when an editor marked the release as corrected. */
    lastModified: string | null;
    lastModifiedLabel: string | null;
    hero: NewsHeroMedia | null;
    imageCaption: string | null;
    body: PortableTextBlock[];
    seo: NewsSeo;
    pressContact: NewsPressContact;
    /** Layout bands from the release's template (or the Default layout). */
    sections: PageSectionDoc[];
};

/** `/newsroom` — pinned releases first, then newest first. */
export type NewsroomCatalog = {
    items: NewsCard[];
    /** `newsroomCatalogPage` bands rendered below the list. */
    sections: PageSectionDoc[];
};

/** NewsArticle publisher — Global Settings → Company, never per release. */
export type NewsPublisher = {
    companyName: string;
    logoUrl: string | null;
};

/**
 * "About PakFactory" + "Media contact" copy, from the release's layout
 * template (PROD-2918 review); empty fields fall back to the standard copy.
 */
export type NewsPressContact = {
    about: PortableTextBlock[];
    mediaText: string;
    mediaEmail: string;
};
