'use client';

import {Clock, Mail, MapPin, MessageCircle, Phone} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';
import {openChat} from '@/lib/chat/open-chat';
import {CONTACT_FALLBACK} from '@/lib/contact/copy';
import type {WwwGlobalSettings} from '@/lib/www-global-settings';

type ContactDetailsProps = {
    settings: WwwGlobalSettings | null;
};

function formatPostalAddress(
    parts: WwwGlobalSettings['companyPostalAddress'],
): string | null {
    if (!parts) return null;
    const line1 = parts.streetAddress?.trim();
    const city = parts.addressLocality?.trim();
    const region = parts.addressRegion?.trim();
    const postal = parts.postalCode?.trim();
    const country = parts.addressCountry?.trim();
    const cityLine = [city, region].filter(Boolean).join(', ');
    const withPostal = [cityLine, postal].filter(Boolean).join(' ');
    const lines = [line1, withPostal, country].filter(Boolean);
    return lines.length ? lines.join('\n') : null;
}

/** Left column: company contact facts from Global Settings. */
export function ContactDetails({settings}: ContactDetailsProps) {
    const phone = settings?.companyPhone?.trim();
    const email = settings?.companyEmail?.trim();
    const hours = settings?.companyHours?.trim();
    const address = formatPostalAddress(settings?.companyPostalAddress);
    const row = 'flex items-start gap-2 text-sm text-muted-foreground';

    return (
        <aside className="order-2 w-full shrink-0 self-stretch bg-muted/60 lg:order-1 lg:w-[300px]">
            <div className="flex h-full flex-col gap-8 px-8 pb-8 pt-8 lg:sticky lg:top-[68px]">
                <div>
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {CONTACT_FALLBACK.liveSupport}
                    </p>
                    <p className="mb-2 text-sm font-semibold text-foreground">
                        {CONTACT_FALLBACK.tollFree}
                    </p>
                    <div className="flex flex-col gap-2">
                        {phone ? (
                            <a
                                href={`tel:${phone.replace(/\s+/g, '')}`}
                                className={cn(row, 'hover:text-foreground')}
                            >
                                <Phone className="mt-0.5 size-4 shrink-0" aria-hidden />
                                {phone}
                            </a>
                        ) : null}
                        {hours ? (
                            <span className={row}>
                                <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
                                {hours}
                            </span>
                        ) : null}
                    </div>
                </div>
                {email ? (
                    <div>
                        <p className="mb-2 text-sm font-semibold text-foreground">
                            {CONTACT_FALLBACK.salesInquiries}
                        </p>
                        <a
                            href={`mailto:${email}`}
                            className={cn(row, 'hover:text-foreground')}
                        >
                            <Mail className="mt-0.5 size-4 shrink-0" aria-hidden />
                            {email}
                        </a>
                    </div>
                ) : null}
                {address ? (
                    <div>
                        <p className="mb-2 text-sm font-semibold text-foreground">
                            {CONTACT_FALLBACK.walkIn}
                        </p>
                        <span className={row}>
                            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                            <span className="whitespace-pre-line">{address}</span>
                        </span>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {CONTACT_FALLBACK.walkInNote}
                        </p>
                    </div>
                ) : null}
                <div className="border-t border-border pt-6 text-sm text-muted-foreground">
                    {CONTACT_FALLBACK.needHelpNow}{' '}
                    <button
                        type="button"
                        onClick={openChat}
                        className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4"
                    >
                        <MessageCircle className="size-3.5" aria-hidden />{' '}
                        {CONTACT_FALLBACK.startChat}
                    </button>
                </div>
            </div>
        </aside>
    );
}
