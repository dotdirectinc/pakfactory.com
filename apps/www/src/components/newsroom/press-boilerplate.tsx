import Link from 'next/link';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@pakfactory/ui/components/card';

import type {PressBoilerplate as PressBoilerplateData} from '@/lib/newsroom/types';
import {WWW_ROUTES} from '@/lib/www-routes';

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
                    <Card className="gap-2">
                        <CardHeader>
                            <CardTitle>
                                <h2 className="text-base">About {companyName}</h2>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="whitespace-pre-line text-base leading-7 text-muted-foreground">
                            {description}
                        </CardContent>
                    </Card>
                ) : null}
                <Card className="gap-2">
                    <CardHeader>
                        <CardTitle>
                            <h2 className="text-base">Media contact</h2>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-base leading-7 text-muted-foreground">
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
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
