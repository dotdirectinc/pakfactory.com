/** Shared bookmark / compare id helpers (server + client safe). */

export function customizationBookmarkId(
    categoryValue: string,
    slug: string,
): string {
    return `${categoryValue.trim()}/${slug.trim()}`;
}

export function parseCustomizationBookmarkId(
    id: string,
): {category: string; slug: string} | null {
    const slash = id.indexOf('/');
    if (slash <= 0 || slash === id.length - 1) return null;
    const category = id.slice(0, slash).trim();
    const slug = id.slice(slash + 1).trim();
    if (!category || !slug || slug.includes('/')) return null;
    return {category, slug};
}
