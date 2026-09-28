import type {
    GoogleReviewsBand,
    ProductTestimonial,
    TestimonialsAggregate,
} from '@/lib/catalog/types';

/** 24h — under Google Maps Platform 30-day Place Details cache limit. */
export const GOOGLE_REVIEWS_REVALIDATE_SECONDS = 86_400;

const MIN_STAR_RATING = 4;

type AuthorAttribution = {
    displayName?: string;
    uri?: string;
    photoUri?: string;
};

type GoogleReview = {
    rating?: number;
    text?: {text?: string};
    authorAttribution?: AuthorAttribution;
    googleMapsUri?: string;
};

type PlaceReviewsResponse = {
    rating?: number;
    userRatingCount?: number;
    reviews?: GoogleReview[];
    googleMapsUri?: string;
    googleMapsLinks?: {
        reviewsUri?: string;
        placeUri?: string;
    };
};

export type GooglePlaceReviews = GoogleReviewsBand;

function reviewsEnabled(): boolean {
    const flag = process.env.GOOGLE_REVIEWS_ENABLED?.trim().toLowerCase();
    if (flag === 'false' || flag === '0' || flag === 'off') return false;
    return true;
}

function apiKey(): string | null {
    return process.env.GOOGLE_PLACES_API_KEY?.trim() || null;
}

function placeId(): string | null {
    return process.env.GOOGLE_PLACES_PLACE_ID?.trim() || null;
}

function mapReview(review: GoogleReview): ProductTestimonial | null {
    const rating = review.rating;
    if (typeof rating !== 'number' || rating < MIN_STAR_RATING) return null;

    const quote = review.text?.text?.trim() ?? '';
    if (!quote) return null;

    const attributionName =
        review.authorAttribution?.displayName?.trim() || 'Google user';
    const avatarUrl = review.authorAttribution?.photoUri?.trim();
    const authorProfileUrl = review.authorAttribution?.uri?.trim();
    const reviewUrl = review.googleMapsUri?.trim();

    return {
        quote,
        attributionName,
        rating,
        source: 'google',
        ...(avatarUrl ? {avatarUrl} : {}),
        ...(authorProfileUrl ? {authorProfileUrl} : {}),
        ...(reviewUrl ? {reviewUrl} : {}),
    };
}

function resolveReviewsProfileUrl(data: PlaceReviewsResponse): string | undefined {
    const fromLinks = data.googleMapsLinks?.reviewsUri?.trim();
    if (fromLinks) return fromLinks;
    const placeUri =
        data.googleMapsLinks?.placeUri?.trim() || data.googleMapsUri?.trim();
    return placeUri || undefined;
}

/**
 * Server-only Place Details (New) reviews fetch.
 * Shared 24h cache keyed by placeId — not page ISR.
 * Never throws; returns null on missing config / HTTP failure / empty filter.
 */
export async function getGooglePlaceReviews(): Promise<GooglePlaceReviews | null> {
    if (!reviewsEnabled()) return null;

    const key = apiKey();
    const id = placeId();
    if (!key || !id) return null;

    const placeIdPath = id.replace(/^places\//, '');
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeIdPath)}`;

    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Goog-Api-Key': key,
                'X-Goog-FieldMask':
                    'reviews,rating,userRatingCount,googleMapsUri,googleMapsLinks',
            },
            next: {revalidate: GOOGLE_REVIEWS_REVALIDATE_SECONDS},
        });

        if (!res.ok) {
            console.error(
                '[places] reviews failed',
                res.status,
                await res.text().catch(() => ''),
            );
            return null;
        }

        const data = (await res.json()) as PlaceReviewsResponse;
        const items = (data.reviews ?? [])
            .map(mapReview)
            .filter((item): item is ProductTestimonial => item !== null);

        if (items.length === 0) return null;

        const hasGoogleTotals =
            typeof data.rating === 'number' &&
            Number.isFinite(data.rating) &&
            typeof data.userRatingCount === 'number' &&
            Number.isFinite(data.userRatingCount);

        const reviewsProfileUrl = resolveReviewsProfileUrl(data);
        const aggregate: TestimonialsAggregate | undefined = hasGoogleTotals
            ? {
                  source: 'google',
                  label: 'Customer Reviews',
                  score: data.rating!,
                  reviewCount: data.userRatingCount!,
              }
            : undefined;

        return {
            items,
            ...(aggregate ? {aggregate} : {}),
            ...(reviewsProfileUrl ? {reviewsProfileUrl} : {}),
        };
    } catch (err) {
        console.error('[places] reviews error', err);
        return null;
    }
}
