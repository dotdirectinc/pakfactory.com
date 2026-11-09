import {INDUSTRY_OPTIONS} from '@/lib/copy/request';
import {WWW_ROUTES} from '@/lib/www-routes';

/**
 * R29 (Website PRD, Unreleased · POC): every landing page starts a request with
 * what the buyer was looking at already attached. The page builds the link; the
 * General or Service brief reads it once when it opens.
 *
 *   /request/general?from=industry&industry=Cosmetics
 *   /request/general?from=solution-style&ref=Rigid+boxes&refUrl=/solutions/…
 *   /request/general?from=contact&question=1
 *   /request/services?from=expertise&service=design
 */
export type RequestEntryFrom =
    | 'industry'
    | 'solution-style'
    | 'product-style'
    | 'expertise'
    | 'contact'
    | 'search';

export type GeneralBriefPrefill = {
    from?: RequestEntryFrom;
    /** Solution industry shortName → the brief's Industry field. */
    industry?: string;
    /** What they were looking at (style name) → noted in the brief. */
    reference?: string;
    referenceUrl?: string;
    /** Search terms with no good match (R31, next phase). */
    search?: string;
    /** Contact Us "Just a question". */
    question?: boolean;
    /**
     * Website PRD v4.7 (R36): what the door already knows the buyer needs. Set explicitly
     * (`need=packaging|service`), or implied by a packaging landing page (industry, solution style,
     * product style). The general intake then hides the choice.
     */
    need?: 'packaging' | 'service';
};

/** Landing pages that sell packaging: their Get a Quote implies Custom packaging. */
const PACKAGING_DOORS: RequestEntryFrom[] = ['industry', 'solution-style', 'product-style'];

/** General request doors open the general quote intake with what the buyer was looking at (Nov 1). */
export function generalBriefHref(p: GeneralBriefPrefill = {}): string {
    const q = new URLSearchParams();
    if (p.from) q.set('from', p.from);
    if (p.industry) q.set('industry', p.industry);
    if (p.reference) q.set('ref', p.reference);
    if (p.referenceUrl) q.set('refUrl', p.referenceUrl);
    if (p.search) q.set('q', p.search);
    if (p.question) q.set('question', '1');
    if (p.need) q.set('need', p.need);
    const qs = q.toString();
    return qs ? `${WWW_ROUTES.requestExpress}?${qs}` : WWW_ROUTES.requestExpress;
}

export function serviceBriefHref(serviceSlug: string): string {
    const q = new URLSearchParams({from: 'expertise', service: serviceSlug});
    return `${WWW_ROUTES.requestServices}?${q.toString()}`;
}

type SearchParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
    const s = (Array.isArray(v) ? v[0] : v)?.trim();
    return s ? s.slice(0, 200) : undefined;
}

export function readGeneralPrefill(sp: SearchParams): GeneralBriefPrefill | null {
    const p: GeneralBriefPrefill = {
        ...(one(sp.from) ? {from: one(sp.from) as RequestEntryFrom} : {}),
        ...(one(sp.industry) ? {industry: one(sp.industry)} : {}),
        ...(one(sp.ref) ? {reference: one(sp.ref)} : {}),
        ...(one(sp.refUrl)?.startsWith('/') ? {referenceUrl: one(sp.refUrl)} : {}),
        ...(one(sp.q) ? {search: one(sp.q)} : {}),
        ...(one(sp.question) === '1' ? {question: true} : {}),
    };
    const need = one(sp.need);
    if (need === 'packaging' || need === 'service') p.need = need;
    else if (p.from && PACKAGING_DOORS.includes(p.from)) p.need = 'packaging';
    return Object.keys(p).length ? p : null;
}

export function readServicePrefill(sp: SearchParams): string | null {
    return one(sp.service) ?? null;
}

const INDUSTRY_HINTS: [RegExp, (typeof INDUSTRY_OPTIONS)[number]][] = [
    [/food|beverage|drink|coffee|tea|snack|bakery|wine|spirit/i, 'Food & Beverage'],
    [/beauty|cosmetic|skin|personal care|fragrance|perfume|makeup/i, 'Beauty & Personal Care'],
    [/health|wellness|supplement|pharma|vitamin/i, 'Health & Wellness'],
    [/cannabis|cbd|hemp/i, 'Cannabis'],
    [/electronic|tech|gadget/i, 'Electronics'],
    [/apparel|fashion|accessor|jewel|clothing/i, 'Apparel & Accessories'],
    [/home|lifestyle|candle|decor/i, 'Home & Lifestyle'],
];

/** The brief's Industry options are fixed; map a solution's name onto one, or null. */
export function matchIndustry(name: string): (typeof INDUSTRY_OPTIONS)[number] | null {
    const exact = INDUSTRY_OPTIONS.find((o) => o.toLowerCase() === name.trim().toLowerCase());
    if (exact) return exact;
    return INDUSTRY_HINTS.find(([re]) => re.test(name))?.[1] ?? null;
}

/** The line added to the brief's notes, or '' when there is nothing to say. */
export function prefillNotes(p: GeneralBriefPrefill): string {
    if (p.question) return 'Just a question: ';
    const parts: string[] = [];
    if (p.reference) parts.push(`I'm interested in: ${p.reference}${p.referenceUrl ? ` (${p.referenceUrl})` : ''}`);
    // An industry the Industry field can't hold is kept in the notes instead.
    if (p.industry && !matchIndustry(p.industry)) parts.push(`Industry: ${p.industry}`);
    if (p.search) parts.push(`I was searching for: ${p.search}`);
    return parts.length ? `${parts.join('\n')}\n` : '';
}
