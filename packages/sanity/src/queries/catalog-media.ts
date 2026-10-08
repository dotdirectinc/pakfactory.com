/**
 * ADR-024 catalog media GROQ — primary still, product videos, lifestyle groups.
 *
 * Projections keep temporary legacy coalesce (`featuredImage` / `media[0]` /
 * `featuredVideo`) when the new arrays are empty so production documents still
 * render until a later production migration.
 */

const IMAGE_ALT = /* groq */ `coalesce(alt, asset->altText)`;

/** Image object with resolved alt (array member or singular). */
export const CATALOG_IMAGE_PROJ = /* groq */ `{
  ...,
  "alt": ${IMAGE_ALT}
}`;

/**
 * Primary product still: marked primary, else first in `images`, else legacy
 * `featuredImage`, else `media[0]`.
 */
export const PRIMARY_PRODUCT_IMAGE_GROQ = /* groq */ `coalesce(
  images[primary == true][0],
  images[0],
  featuredImage,
  media[0]
)`;

/** Card / list thumb — projection key stays `cardImage` for www consumers. */
export const CARD_IMAGE_FROM_CATALOG = /* groq */ `"cardImage": ${PRIMARY_PRODUCT_IMAGE_GROQ}${CATALOG_IMAGE_PROJ}`;

/** Alias as `featuredImage` for consumers that still select that key. */
export const FEATURED_IMAGE_FROM_CATALOG = /* groq */ `"featuredImage": ${PRIMARY_PRODUCT_IMAGE_GROQ}${CATALOG_IMAGE_PROJ}`;

/**
 * Playable URL from a catalogVideo / featuredVideo-shaped object.
 * YouTube and unset → null (ambient/hover keep the still).
 */
export function catalogVideoUrlGroq(path: string): string {
  return /* groq */ `select(
    ${path}.source == "upload" => ${path}.file.asset->url,
    ${path}.source == "url" => ${path}.url,
    defined(${path}.asset) => ${path}.asset->url,
    null
  )`;
}

/** First playable product video, else legacy `featuredVideo`. */
export const FEATURED_VIDEO_URL_FROM_CATALOG = /* groq */ `"featuredVideoUrl": coalesce(
  ${catalogVideoUrlGroq('videos[0]')},
  select(
    featuredVideo.source == "upload" => featuredVideo.file.asset->url,
    featuredVideo.source == "url" => featuredVideo.url,
    defined(featuredVideo.asset) => featuredVideo.asset->url,
    null
  )
)`;

/** First playable lifestyle video (CDP Benefits/Specs sticky media). */
export const LIFESTYLE_VIDEO_URL_FROM_CATALOG = /* groq */ `"lifestyleVideoUrl": ${catalogVideoUrlGroq('lifestyleVideos[0]')}`;

/** Full media arrays for gallery / hover (product + lifestyle). */
export const CATALOG_MEDIA_ARRAYS = /* groq */ `
  images[]${CATALOG_IMAGE_PROJ},
  lifestyleImages[]${CATALOG_IMAGE_PROJ},
  videos[]{
    source,
    url,
    youtubeUrl,
    "fileUrl": file.asset->url,
    thumbnail${CATALOG_IMAGE_PROJ}
  },
  lifestyleVideos[]{
    source,
    url,
    youtubeUrl,
    "fileUrl": file.asset->url,
    thumbnail${CATALOG_IMAGE_PROJ}
  },
  ${FEATURED_IMAGE_FROM_CATALOG},
  ${FEATURED_VIDEO_URL_FROM_CATALOG},
  ${LIFESTYLE_VIDEO_URL_FROM_CATALOG},
  "media": select(
    count(images) > 0 => images[]${CATALOG_IMAGE_PROJ},
    media[]${CATALOG_IMAGE_PROJ}
  )
`;

/**
 * Lightweight option / achievedBy card media — primary still + gallery extras.
 * Keeps `featuredImage` / `media` keys for www map-sanity.
 */
export const OPTION_MEDIA_FIELDS = /* groq */ `
  ${FEATURED_IMAGE_FROM_CATALOG},
  "media": select(
    count(images) > 0 => images[]${CATALOG_IMAGE_PROJ},
    media[]${CATALOG_IMAGE_PROJ}
  ),
  images[]${CATALOG_IMAGE_PROJ},
  lifestyleImages[]${CATALOG_IMAGE_PROJ},
  ${FEATURED_VIDEO_URL_FROM_CATALOG},
  ${LIFESTYLE_VIDEO_URL_FROM_CATALOG}
`;

/** Card / section `imageSrc` from primary product still (legacy coalesce). */
export const CATALOG_IMAGE_SRC = /* groq */ `coalesce(
  images[primary == true][0].asset->url,
  images[0].asset->url,
  featuredImage.asset->url,
  media[0].asset->url
)`;

/** Card / section `imageAlt` from primary product still (legacy coalesce). */
export const CATALOG_IMAGE_ALT = /* groq */ `coalesce(
  images[primary == true][0].alt,
  images[primary == true][0].asset->altText,
  images[0].alt,
  images[0].asset->altText,
  featuredImage.alt,
  featuredImage.asset->altText,
  media[0].alt,
  media[0].asset->altText
)`;

/**
 * Playable video URL for section cards — first product video, else legacy
 * `featuredVideo`. YouTube yields null.
 */
export const CATALOG_VIDEO_SRC = /* groq */ `coalesce(
  ${catalogVideoUrlGroq('videos[0]')},
  select(
    featuredVideo.source == "upload" => featuredVideo.file.asset->url,
    featuredVideo.source == "url" => featuredVideo.url,
    defined(featuredVideo.asset) => featuredVideo.asset->url,
    null
  )
)`;
