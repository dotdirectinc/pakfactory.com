import {defineField} from 'sanity'

type FeaturedVideoFieldOptions = {
  /** Field group/tab id. */
  group?: string
  /** Override the field description for the host document’s role. */
  description?: string
}

/**
 * The shared `featuredVideo` object field — Expertise Stage (ADR-024 moved Product,
 * Product Line, and Customization Option to `videos[]`). Editors learn one
 * multi-source control (upload | S3/CDN URL | YouTube).
 */
export function featuredVideoField({
  group,
  description,
}: FeaturedVideoFieldOptions = {}) {
  return defineField({
    name: 'featuredVideo',
    title: 'Featured video',
    type: 'featuredVideo',
    ...(group ? {group} : {}),
    description:
      description ??
      'Optional video. Upload or a direct S3/CDN file URL play as muted loop / hover; YouTube is stored but the still image is used for ambient playback.',
  })
}
