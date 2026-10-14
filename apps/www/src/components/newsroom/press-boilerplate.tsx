import Link from 'next/link';

import type {PressBoilerplate as PressBoilerplateData} from '@/lib/newsroom/types';
import {WWW_ROUTES} from '@/lib/www-routes';

const CARD_CLASS =
    'flex flex-col gap-2 rounded-xl border border-border bg-card p-6 shadow-sm';

const LINK_CLASS =
    'font-medium text-foreground underline underline-offset-4 hover:no-underline';

/**
 * End mark + "About PakFactory" + "Media contact" (PROD-2918). Copy comes from
 * Global Settings → Company → Organization (`description`, `pressEmail`), kept
 * once for every release — never per release.
 */
export function PressBoilerplate({
    boilerplate,
}: {
    boilerplate: PressBoilerplateData;
}) {
    const {companyName, description, pressEmail} = boilerplate;

    return (
        <>
            <p
                className="my-10 text-center text-sm tracking-[0.3em] text-muted-foreground"
                aria-hidden
            >
                ###
            </p>
            <div className="flex flex-col gap-4">
                {description ? (
                    <section className={CARD_CLASS} aria-labelledby="press-about">
                        <h2
                            id="press-about"
                            className="text-base font-semibold text-foreground"
                        >
                            About {companyName}
                        </h2>
                        <p className="whitespace-pre-line text-base leading-7 text-muted-foreground">
                            {description}
                        </p>
                    </section>
                ) : null}
                <section className={CARD_CLASS} aria-labelledby="press-contact">
                    <h2
                        id="press-contact"
                        className="text-base font-semibold text-foreground"
                    >
                        Media contact
                    </h2>
                    <p className="text-base leading-7 text-muted-foreground">
                        {pressEmail ? (
                            <>
                                For media inquiries, email{' '}
                                <a href={`mailto:${pressEmail}`} className={LINK_CLASS}>
                                    {pressEmail}
                                </a>
                            </>
                        ) : (
                            <>
                                For media inquiries,{' '}
                                <Link href={WWW_ROUTES.contact} className={LINK_CLASS}>
                                    contact us
                                </Link>
                                .
                            </>
                        )}
                    </p>
                </section>
            </div>
        </>
    );
}
