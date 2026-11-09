'use client';

import Link from 'next/link';
import {Checkbox} from '@pakfactory/ui/components/checkbox';
import {cn} from '@pakfactory/ui/lib/utils';
import {policyHref} from '@/lib/www-routes';

/**
 * Is the signed-in buyer already subscribed to marketing email? Not known yet (needs an
 * account field), so the opt-in is always offered.
 */
export function useMarketingSubscribed(): boolean {
    return false;
}

/**
 * Consent at submit (R32), in two parts placed around the submit button (owner, Oct 29):
 * the opt-in checkbox ABOVE the button, the privacy line UNDER it (it replaces
 * "We'll follow up with a quote."). The opt-in is off by default and hidden for
 * signed-in buyers who are already subscribed.
 */
export function MarketingOptIn({
    optIn,
    onOptInChange,
    idSuffix = '',
    compact: _compact = false,
}: {
    optIn: boolean;
    onOptInChange: (value: boolean) => void;
    idSuffix?: string;
    /** Kept for call sites; opt-in is always text-sm on the intake scale. */
    compact?: boolean;
}) {
    void _compact;
    const subscribed = useMarketingSubscribed();
    if (subscribed) return null;
    const id = `rfq-marketing-opt-in${idSuffix}`;
    return (
        <label
            htmlFor={id}
            className="flex cursor-pointer items-center gap-2 text-left text-sm text-foreground"
        >
            <Checkbox id={id} checked={optIn} onCheckedChange={(value) => onOptInChange(value === true)} />
            <span>Email me packaging ideas and offers (optional)</span>
        </label>
    );
}

const PRIVACY_PURPOSE = 'We use your details to prepare your quote and follow up about this request.';

/** `purpose` replaces the quote wording (e.g. Contact enquiries: "to reply to your message"). */
export function PrivacyLine({className, purpose = PRIVACY_PURPOSE}: {className?: string; purpose?: string}) {
    return (
        <p className={cn('text-xs leading-snug text-muted-foreground', className)}>
            {purpose} See our{' '}
            <Link href={policyHref('privacy-policy')} className="underline underline-offset-2">
                Privacy Policy
            </Link>
            .
        </p>
    );
}

/**
 * Spam / bot protection (R33): a field people never see. Bots that fill every
 * input fill this one too; submitRequest refuses those.
 */
export function HoneypotField({value, onChange}: {value: string; onChange: (v: string) => void}) {
    return (
        <div aria-hidden className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden">
            <label htmlFor="rfq-website">Website</label>
            <input
                id="rfq-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}
