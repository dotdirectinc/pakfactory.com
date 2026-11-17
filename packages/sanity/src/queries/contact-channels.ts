/**
 * Contact directory channel rows (Link · Chat · Enquiry) — shared by the
 * `contactDirectory` section projection and enquiry route helpers.
 */

import type {SanityLinkDocument} from '../resolve-document-href'

export type ContactEnquiryChoice = {
  _key: string
  value?: string | null
  label?: string | null
  hint?: string | null
}

export type ContactEnquiryField = {
  _key: string
  kind?: 'text' | 'email' | 'tel' | 'textarea' | 'choice' | string | null
  label?: string | null
  required?: boolean | null
  placeholder?: string | null
  options?: ContactEnquiryChoice[] | null
}

export type ContactEnquiryScreen = {
  _key: string
  heading?: string | null
  helper?: string | null
  fields?: ContactEnquiryField[] | null
}

export type ContactChannelLink = {
  linkType?: string | null
  externalUrl?: string | null
  relativePath?: string | null
  internalLink?: SanityLinkDocument | null
}

export type ContactChannelDoc = {
  _key: string
  title?: string | null
  line?: string | null
  ctaLabel?: string | null
  action?: 'link' | 'chat' | 'enquiry' | string | null
  link?: ContactChannelLink | null
  enquirySlug?: string | null
  sendTo?: 'support' | 'marketing' | 'sales' | string | null
  screens?: ContactEnquiryScreen[] | null
  sendLabel?: string | null
  sentTitle?: string | null
  sentBody?: string | null
}

const LINKABLE_DOC = /* groq */ `{
  _id,
  _type,
  title,
  "slug": slug.current,
  "name": name,
  "term": term,
  pageRole,
  pageType,
  category,
  "handle": handle.current,
  "collectionSlug": primaryCollection->slug.current,
  "pageSlug": primaryLandingPage->slug.current
}`

/** Projection for one `contactChannel` object (and nested enquiry screens). */
export const CONTACT_CHANNEL_PROJECTION = /* groq */ `{
  _key,
  title,
  line,
  ctaLabel,
  action,
  link {
    linkType,
    externalUrl,
    relativePath,
    "internalLink": internalLink->${LINKABLE_DOC}
  },
  "enquirySlug": enquirySlug.current,
  sendTo,
  screens[] {
    _key,
    heading,
    helper,
    fields[] {
      _key,
      kind,
      label,
      required,
      placeholder,
      options[] {
        _key,
        value,
        label,
        hint
      }
    }
  },
  sendLabel,
  sentTitle,
  sentBody
}`
