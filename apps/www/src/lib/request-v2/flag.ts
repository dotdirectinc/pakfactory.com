/**
 * RFQ v2 feature flag (vault prd-website-rfq-v2.md; PORTING "coexist, then promote").
 * On in staging, off in production until the owner switches it: set
 * `NEXT_PUBLIC_RFQ_V2=1` in that environment. Off = today's request flow, unchanged routes.
 */
export const RFQ_V2_ENABLED =
    process.env.NEXT_PUBLIC_RFQ_V2 === '1' || process.env.NEXT_PUBLIC_RFQ_V2 === 'true';
