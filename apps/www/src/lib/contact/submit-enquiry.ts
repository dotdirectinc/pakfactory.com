'use server';

/**
 * Confirm-only enquiry submit. Desk / CRM delivery is a later ticket.
 * Always succeeds so the success screen can show Studio copy.
 */
export type EnquirySubmitInput = {
    slug: string;
    sendTo: 'support' | 'marketing' | 'sales';
    answers: Record<string, string>;
};

export async function submitEnquiry(
    _input: EnquirySubmitInput,
): Promise<{ok: true}> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return {ok: true};
}
