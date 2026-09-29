/**
 * Shared GROQ projection for the Studio `featuredVideo` object
 * (upload | url | youtube). YouTube yields null — ambient/hover use the still.
 * `featuredVideo.asset->url` coalesces legacy bare-file shape pre-migration.
 */
export const FEATURED_VIDEO_URL_GROQ = /* groq */ `select(
  featuredVideo.source == "upload" => featuredVideo.file.asset->url,
  featuredVideo.source == "url" => featuredVideo.url,
  defined(featuredVideo.asset) => featuredVideo.asset->url,
  null
)`;

export const FEATURED_VIDEO_URL_FIELD = /* groq */ `"featuredVideoUrl": ${FEATURED_VIDEO_URL_GROQ}`;
