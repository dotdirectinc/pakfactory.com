import Link from 'next/link';
import {Button} from '@pakfactory/ui/components/button';
import type {WwwGlobalSettings} from '@/lib/www-global-settings';
import {WWW_ROUTES} from '@/lib/www-routes';

type ContactDetailsBlockProps = {
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

/**
 * Code-owned Contact details from Global Settings. Address, email, phone and
 * hours never live on the Content Page document — see contentPage schema.
 */
export function ContactDetailsBlock({settings}: ContactDetailsBlockProps) {
    const email = settings?.companyEmail?.trim();
    const phone = settings?.companyPhone?.trim();
    const hours = settings?.companyHours?.trim();
    const address = formatPostalAddress(settings?.companyPostalAddress);
    const hasDetails = Boolean(email || phone || hours || address);

    return (
        <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Ways to reach us
            </h2>
            {hasDetails ? (
                <dl className="mt-6 space-y-4 text-sm text-foreground">
                    {email ? (
                        <div>
                            <dt className="font-medium text-muted-foreground">
                                Email
                            </dt>
                            <dd className="mt-1">
                                <a
                                    href={`mailto:${email}`}
                                    className="underline underline-offset-4 hover:no-underline"
                                >
                                    {email}
                                </a>
                            </dd>
                        </div>
                    ) : null}
                    {phone ? (
                        <div>
                            <dt className="font-medium text-muted-foreground">
                                Phone
                            </dt>
                            <dd className="mt-1">
                                <a
                                    href={`tel:${phone.replace(/\s+/g, '')}`}
                                    className="underline underline-offset-4 hover:no-underline"
                                >
                                    {phone}
                                </a>
                            </dd>
                        </div>
                    ) : null}
                    {address ? (
                        <div>
                            <dt className="font-medium text-muted-foreground">
                                Address
                            </dt>
                            <dd className="mt-1 whitespace-pre-line">
                                {address}
                            </dd>
                        </div>
                    ) : null}
                    {hours ? (
                        <div>
                            <dt className="font-medium text-muted-foreground">
                                Hours
                            </dt>
                            <dd className="mt-1">{hours}</dd>
                        </div>
                    ) : null}
                </dl>
            ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                    Contact details are managed in Global Settings.
                </p>
            )}
            <div className="mt-8 flex flex-wrap gap-4">
                <Button asChild size="lg">
                    <Link href={WWW_ROUTES.request}>Request a quote</Link>
                </Button>
                <p className="self-center text-sm text-muted-foreground">
                    Prefer chat? Open the chat widget when it is available on
                    this page.
                </p>
            </div>
        </section>
    );
}
