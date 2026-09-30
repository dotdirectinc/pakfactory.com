import {HeroRating} from '@/components/ui/hero-rating';
import type {HeroTone} from '@/components/ui/hero-cta-group';
import {getGooglePlaceReviews} from '@/lib/places/reviews';

/**
 * Live Google score for hero proof (PROD-2666). Same Places source as the
 * Reviews section; renders nothing when reviews are off or unavailable.
 * Wrap in `Suspense` so the fetch never blocks the hero.
 */
export async function HeroGoogleRating({tone}: {tone?: HeroTone}) {
    const reviews = await getGooglePlaceReviews();
    if (!reviews?.aggregate) return null;
    return <HeroRating aggregate={reviews.aggregate} tone={tone} />;
}
