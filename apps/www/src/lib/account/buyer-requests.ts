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
 * `customer_id = null` and matches no policy until it is claimed.
 *
 * There IS a claim flow now (PROD-2446): `claim_rfqs_for_current_user` runs on
 * email verification and attaches rows whose `contact_email` matches the
 * VERIFIED address. It is safe for the reason the old comment here feared it
 * would not be — it reads the address from `auth.users` for `auth.uid()` rather
 * than from anything the caller passes, and it only touches rows where
 * `customer_id is null`, so no request already belonging to someone can move.
 *
 * So an empty list means "you submitted while signed out and have not verified
 * that address", not "we lost it".
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
    /**
     * Where correspondence for this request goes — NOT necessarily the address
     * of the account reading this page. `customer_id` comes from the session
     * while the contact address is typed into the builder, so a buyer can raise
     * a request on a colleague's behalf. Shown because the two silently
     * diverging is confusing precisely when it matters: it decides who received
     * the confirmation and who any follow-up reaches.
     */
    contactEmail: string;
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

const COLUMNS = 'id, reference, contact_email, payload, submitted_at';

type Row = {
    id: string;
    reference: string;
    submitted_at: string;
    contact_email: string | null;
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
    contact?: {email?: string};
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
        // The COLUMN is authoritative: it is what the receipt was sent to and
        // what `claim_rfqs_for_current_user` matches on. The payload copy is
        // whatever the buyer typed, kept only as a fallback for older rows.
        contactEmail: row.contact_email ?? s.contact?.email ?? '',
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
