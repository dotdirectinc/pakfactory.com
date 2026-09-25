/**
 * Resolve section eyebrow/heading/intro/link-query/link-path page-field tokens (ADR-020).
 * Tokens match Studio chips: %h1% %title% %description% %shortName% %shortDescription% %slug%
 */

export type SectionTokenContext = {
    /** Page H1; callers should already coalesce empty h1 → title. */
    h1: string
    title: string
    /** Plain text from host description (e.g. GROQ `pt::text(description)`). */
    description: string
    shortName: string
    shortDescription: string
    /** URL slug of the host document (e.g. solution slug for industry facet). */
    slug: string
}

const TOKEN_PATTERN =
    /%(h1|title|description|shortName|shortDescription|slug)%/g

/**
 * Replace known `%tokens%` from the host page context.
 * Unknown tokens are left as-is. Empty ctx values become '' and doubled spaces collapse.
 */
export function resolveSectionTokens(
    template: string | null | undefined,
    ctx: SectionTokenContext,
): string {
    if (!template) return ''
    const values: Record<string, string> = {
        h1: ctx.h1,
        title: ctx.title,
        description: ctx.description,
        shortName: ctx.shortName,
        shortDescription: ctx.shortDescription,
        slug: ctx.slug,
    }
    const replaced = template.replace(TOKEN_PATTERN, (_match, key: string) => {
        return values[key] ?? ''
    })
    return replaced.replace(/[ \t]{2,}/g, ' ').trim()
}

type SectionWithChrome = {
    eyebrow?: string | null
    heading?: string | null
    intro?: string | null
    link?: {
        query?: string | null
        relativePath?: string | null
        [key: string]: unknown
    } | null
    [key: string]: unknown
}

/** Resolve eyebrow + heading + intro + link.query / link.relativePath tokens on every section object (shallow). */
export function applySectionTokens<T extends SectionWithChrome>(
    sections: T[],
    ctx: SectionTokenContext,
): T[] {
    return sections.map((section) => {
        const next: T = {
            ...section,
            eyebrow: section.eyebrow
                ? resolveSectionTokens(section.eyebrow, ctx)
                : section.eyebrow,
            heading: section.heading
                ? resolveSectionTokens(section.heading, ctx)
                : section.heading,
            intro: section.intro
                ? resolveSectionTokens(section.intro, ctx)
                : section.intro,
        }
        if (section.link?.query || section.link?.relativePath) {
            next.link = {
                ...section.link,
                ...(section.link.query
                    ? {query: resolveSectionTokens(section.link.query, ctx)}
                    : {}),
                ...(section.link.relativePath
                    ? {
                          relativePath: resolveSectionTokens(
                              section.link.relativePath,
                              ctx,
                          ),
                      }
                    : {}),
            }
        }
        return next
    })
}

/** Build token ctx from a solution (or similar) host document. */
export function sectionTokenContextFromHost(host: {
    title?: string | null
    h1?: string | null
    shortName?: string | null
    shortDescription?: string | null
    slug?: string | null
    /** Prefer pre-flattened plain text (e.g. descriptionText from GROQ). */
    descriptionText?: string | null
}): SectionTokenContext {
    const title = host.title?.trim() || ''
    const h1 = host.h1?.trim() || title
    const shortName = host.shortName?.trim() || title
    const shortDescription = host.shortDescription?.trim() || ''
    const description = host.descriptionText?.trim() || ''
    const slug = host.slug?.trim() || ''
    return {title, h1, shortName, shortDescription, description, slug}
}
