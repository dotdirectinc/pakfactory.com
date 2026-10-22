/**
 * Catalog card rest / hover stills (PROD-3130).
 *
 * Resting image is whatever the card already shows (primary product still).
 * Hover is Sanity `images[1]` — a product still, never lifestyle.
 * Missing or identical second still → no swap.
 */

export type CardStill = {
    src: string;
    alt?: string;
};

export function pickCardHoverStill(
    restSrc: string | null | undefined,
    second: {src?: string | null; alt?: string | null} | null | undefined,
): CardStill | null {
    const hoverSrc = second?.src?.trim() || '';
    if (!hoverSrc) return null;
    if (hoverSrc === (restSrc?.trim() || '')) return null;
    const alt = second?.alt?.trim();
    return alt ? {src: hoverSrc, alt} : {src: hoverSrc};
}

/** Resting still plus `images[1]` when that URL is distinct. */
export function cardGalleryStills(
    rest: {src?: string | null; alt?: string | null} | null | undefined,
    second: {src?: string | null; alt?: string | null} | null | undefined,
): CardStill[] | undefined {
    const restSrc = rest?.src?.trim();
    if (!restSrc) return undefined;
    const restAlt = rest?.alt?.trim();
    const restStill: CardStill = restAlt
        ? {src: restSrc, alt: restAlt}
        : {src: restSrc};
    const hover = pickCardHoverStill(restSrc, second);
    return hover ? [restStill, hover] : [restStill];
}
