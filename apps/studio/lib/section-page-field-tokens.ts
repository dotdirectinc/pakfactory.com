/**
 * Page-field tokens for section heading / intro / link query (ADR-020).
 * Studio chips insert these; www resolves them from the host document.
 * Keep labels in sync with Solution / Line / Style / Product naming.
 */

export type SectionPageFieldToken = {
  /** Chip / menu label in Studio. */
  label: string
  /** Stored substring, e.g. `%h1%`. */
  token: string
  /** Ctx key on the host page (www). */
  ctxKey:
    | 'h1'
    | 'title'
    | 'description'
    | 'shortName'
    | 'shortDescription'
    | 'slug'
}

export const SECTION_PAGE_FIELD_TOKENS: readonly SectionPageFieldToken[] = [
  {label: 'H1', token: '%h1%', ctxKey: 'h1'},
  {label: 'Title', token: '%title%', ctxKey: 'title'},
  {label: 'Description', token: '%description%', ctxKey: 'description'},
  {label: 'Short name', token: '%shortName%', ctxKey: 'shortName'},
  {
    label: 'Short description',
    token: '%shortDescription%',
    ctxKey: 'shortDescription',
  },
  {label: 'Slug', token: '%slug%', ctxKey: 'slug'},
] as const

/** Regex matching any known page-field token. */
export const SECTION_TOKEN_PATTERN =
  /%(h1|title|description|shortName|shortDescription|slug)%/g

export function tokenByStored(token: string): SectionPageFieldToken | undefined {
  return SECTION_PAGE_FIELD_TOKENS.find((t) => t.token === token)
}

export function labelForToken(token: string): string {
  return tokenByStored(token)?.label ?? token
}
