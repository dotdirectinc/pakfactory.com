/**
 * The visitor's IP from proxy headers: leftmost `x-forwarded-for`, then
 * `x-real-ip`. On Vercel the leftmost hop is the client. Same rule as the
 * private helpers in `places/actions.ts` and `rfq/submit-request.ts`.
 */
export function clientIpFrom(headers: Headers): string | null {
    const forwarded = headers.get('x-forwarded-for');
    const first = forwarded?.split(',')[0]?.trim();
    return first || headers.get('x-real-ip')?.trim() || null;
}
