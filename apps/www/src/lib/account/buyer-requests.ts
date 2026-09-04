import {createClient} from '@pakfactory/supabase/server';

/**
 * The buyer's own requests.
 *
 * 🔴 THE SCOPING IS THE DATABASE'S JOB. `public.rfq` carries `rfq_select_own`
 * (`customer_id = (select auth.uid())`), and this uses the SESSION-SCOPED client
 * — anon key plus the caller's cookies — so `auth.uid()` is set and that policy
 * runs. There is deliberately no `.eq('customer_id', …)` here: a service-role
 * read would bypass RLS and leave one forgotten filter between two customers.
 *
 * ── Why a guest sees nothing, and why that is correct ───────────────────────
 * Submission has no sign-in gate (ADR-0012 D1), so a guest's RFQ has
 * `customer_id = null` and matches no policy. That is the decision of
 * 2026-09-04: a guest's confirmation email is their record, and history belongs
 * to an account. There is no claim flow on purpose — auto-claiming by email
 * would let anyone take another person's requests by registering it.
 *
 * So an empty list here means "you submitted while signed out", not "we lost it".
 */

export type BuyerRequestSummary = {
    id: string;
    reference: string;
    submittedAt: string;
    /** What they asked for, in one line — enough to tell two requests apart. */
    summary: string;
    itemCount: number;
};

export type BuyerRequestDetail = BuyerRequestSummary & {
    notes: string;
    packagingContents: string;
    quantities: number[];
    timeline: string;
    shipTo: string;
    /** Names only. ADR-0013 D3 forbids an S3 URL, and a buyer has no authorised
     *  route to the bytes — the serving route is staff-only (PROD-2434). */
    fileNames: string[];
    lines: {
        id: string;
        productSlug: string;
        contents: string;
        quantities: number[];
        customizations: string[];
    }[];
};

const COLUMNS = 'id, reference, payload, submitted_at';

type Row = {
    id: string;
    reference: string;
    submitted_at: string;
    payload: unknown;
};

type Stored = {
    requirements?: {
        notes?: string;
        packagingContents?: string;
        timeline?: string;
        expressQuantity?: number;
        expressQuantities?: number[];
    };
    shipTo?: {city?: string; region?: string; country?: string} | null;
    attachments?: {name?: string}[];
    lines?: {
        id?: string;
        productSlug?: string;
        contents?: string;
        quantities?: number[];
        customizations?: {label?: string}[];
        referenceImages?: unknown;
        attachments?: {name?: string}[];
    }[];
    metadata?: {entryKind?: string};
};

const asStored = (payload: unknown): Stored =>
    payload && typeof payload === 'object' ? (payload as Stored) : {};

/** Both spellings are accepted server-side, so both are read — taking only the
 *  singular would drop every tier after the first. */
function expressQuantities(s: Stored): number[] {
    const many = s.requirements?.expressQuantities ?? [];
    const one =
        typeof s.requirements?.expressQuantity === 'number'
            ? [s.requirements.expressQuantity]
            : [];
    return [...new Set([...one, ...many])];
}

function toSummary(row: Row): BuyerRequestSummary {
    const s = asStored(row.payload);
    const lines = s.lines ?? [];
    const summary =
        lines.length > 0
            ? lines.map((l) => l.productSlug ?? '').filter(Boolean).join(', ')
            : (s.requirements?.packagingContents ?? '').trim();

    return {
        id: row.id,
        reference: row.reference,
        submittedAt: row.submitted_at,
        // Never empty: a row with neither is still a real request the buyer sent,
        // and a blank line reads as a rendering fault.
        summary: summary || 'Packaging request',
        itemCount: lines.length,
    };
}

function toDetail(row: Row): BuyerRequestDetail {
    const s = asStored(row.payload);
    const address = s.shipTo;
    return {
        ...toSummary(row),
        notes: s.requirements?.notes ?? '',
        packagingContents: s.requirements?.packagingContents ?? '',
        quantities: expressQuantities(s),
        timeline: s.requirements?.timeline ?? '',
        shipTo: [address?.city, address?.region, address?.country]
            .map((p) => p?.trim())
            .filter(Boolean)
            .join(', '),
        // Request-level and per-line files, flattened — the buyer does not think
        // of them as belonging to one or the other.
        fileNames: [
            ...(s.attachments ?? []),
            ...(s.lines ?? []).flatMap((l) => l.attachments ?? []),
        ]
            .map((f) => f.name)
            .filter((n): n is string => Boolean(n)),
        lines: (s.lines ?? []).map((l, i) => ({
            id: l.id ?? `line-${i}`,
            productSlug: l.productSlug ?? '',
            contents: l.contents ?? '',
            quantities: l.quantities ?? [],
            customizations: (l.customizations ?? [])
                .map((c) => c.label)
                .filter((v): v is string => Boolean(v)),
        })),
    };
}

export async function listBuyerRequests(): Promise<BuyerRequestSummary[]> {
    const supabase = await createClient();
    const {data, error} = await supabase
        .from('rfq')
        .select(COLUMNS)
        .order('submitted_at', {ascending: false});

    if (error) throw new Error(`request list failed: ${error.message}`);
    return ((data as Row[] | null) ?? []).map(toSummary);
}

export async function getBuyerRequest(
    id: string,
): Promise<BuyerRequestDetail | null> {
    if (!id) return null;
    const supabase = await createClient();
    const {data, error} = await supabase
        .from('rfq')
        .select(COLUMNS)
        .eq('id', id)
        .maybeSingle();

    if (error) throw new Error(`request fetch failed: ${error.message}`);
    // Null covers three cases that must stay indistinguishable: it does not
    // exist, it belongs to someone else, or RLS hid it. Telling them apart would
    // confirm the existence of records this buyer may not see.
    return data ? toDetail(data as Row) : null;
}
