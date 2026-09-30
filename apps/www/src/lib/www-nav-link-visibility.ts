import type {WebsiteNavLinkDoc} from '@pakfactory/sanity/queries';
import {
    isCatalogTargetVisible,
    isCustomerFacingVisible,
    isLineStyleActiveStatus,
    isListedCatalogStatus,
} from '@pakfactory/sanity/catalog-visibility';

export {
    isCatalogTargetVisible,
    isCustomerFacingVisible,
    isLineStyleActiveStatus,
    isListedCatalogStatus,
};

/**
 * Whether a Sanity catalog target may appear in www chrome (header mega,
 * footer). Delegates to shared `@pakfactory/sanity/catalog-visibility`.
 */
export function isWwwNavInternalLinkVisible(
    doc:
        | WebsiteNavLinkDoc['internalLink']
        | WebsiteNavLinkDoc['pathTarget']
        | null
        | undefined,
): boolean {
    return isCatalogTargetVisible(doc);
}

/**
 * Drop curated chrome links whose catalog target is no longer listable.
 * Internal links use `internalLink`; path links use GROQ-resolved `pathTarget`
 * when the URL maps to a product line / style / product / customization.
 * Other path / external links pass through unchanged.
 */
export function isWwwNavLinkVisible(
    link: WebsiteNavLinkDoc | null | undefined,
): boolean {
    if (!link) return false;
    if (link.linkType === 'internal') {
        return isWwwNavInternalLinkVisible(link.internalLink);
    }
    if (link.linkType === 'path' && link.pathTarget) {
        return isWwwNavInternalLinkVisible(link.pathTarget);
    }
    return true;
}
