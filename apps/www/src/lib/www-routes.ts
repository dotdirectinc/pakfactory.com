/** Href registry for top-level www flows (PROD-1429). Nav may import later. */
export const WWW_ROUTES = {
    home: '/',
    products: '/products',
    customizations: '/customizations',
    caseStudies: '/case-studies',
    solutions: '/solutions',
    expertise: '/expertise',
    about: '/about',
    contact: '/contact',
    account: '/account',
    /** List URL; detail is `/account/requests/[id]` via accountRequestHref. */
    accountRequests: '/account/requests',
    accountProfile: '/account/profile',
    login: '/login',
    signUp: '/sign-up',
    forgotPassword: '/forgot-password',
    policies: '/policies',
    bundles: '/bundles',
    request: '/request',
    requestProducts: '/request/products',
    requestExpress: '/request/general',
    requestServices: '/request/services',
} as const;

export type WwwRouteHref = (typeof WWW_ROUTES)[keyof typeof WWW_ROUTES];

export function accountRequestHref(id: string): string {
    return `${WWW_ROUTES.accountRequests}/${id}`;
}

export function productHref(slug: string): string {
    return `${WWW_ROUTES.products}/${slug}`;
}

export function productStyleHref(lineSlug: string, styleSlug: string): string {
    return `${WWW_ROUTES.products}/${lineSlug}/${styleSlug}`;
}

export function customizationCategoryHref(
    category: string,
    slug: string,
): string {
    return `${WWW_ROUTES.customizations}/${category}/${slug}`;
}

/** Canonical multi-option compatibility engine (PROD-2921). */
export function customizationCompatibilityHref(query = ''): string {
    const base = `${WWW_ROUTES.customizations}/compatibility`;
    const qs = query.replace(/^\?/, '');
    return qs ? `${base}?${qs}` : base;
}

/** Single-option entry into the compatibility view (PROD-2921). */
export function customizationCompatibleHref(
    category: string,
    handle: string,
    query = '',
): string {
    const base = `${WWW_ROUTES.customizations}/${category}/${handle}/compatible`;
    const qs = query.replace(/^\?/, '');
    return qs ? `${base}?${qs}` : base;
}

export function solutionHref(slug: string): string {
    return `${WWW_ROUTES.solutions}/${slug}`;
}

export function expertiseHref(slug: string): string {
    return `${WWW_ROUTES.expertise}/${slug}`;
}

export function solutionStyleHref(
    solutionSlug: string,
    styleSlug: string,
): string {
    return `${WWW_ROUTES.solutions}/${solutionSlug}/${styleSlug}`;
}

export function policyHref(slug: string): string {
    return `${WWW_ROUTES.policies}/${slug}`;
}

export function bundleHref(slug: string): string {
    return `${WWW_ROUTES.bundles}/${slug}`;
}
