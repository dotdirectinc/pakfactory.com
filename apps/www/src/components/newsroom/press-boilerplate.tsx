import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@pakfactory/ui/components/card';

import type {PressBoilerplate as PressBoilerplateData} from '@/lib/newsroom/types';

const LINK_CLASS =
    'font-medium text-foreground underline underline-offset-4 hover:no-underline';

/**
 * End mark + "About PakFactory" + "Media contact" (PROD-2918). Copy comes from
 * Global Settings → Company: About from Company description, the email from
 * Contact info → Media enquiries email. No fallback copy — a card whose field
 * is empty in Studio is not rendered.
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
            {description || pressEmail ? (
                <div className="flex flex-col gap-4">
                    {description ? (
                        <Card className="gap-2">
                            <CardHeader>
                                <CardTitle>
                                    <h2 className="text-base">
                                        {companyName ? `About ${companyName}` : 'About'}
                                    </h2>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="whitespace-pre-line text-base leading-7 text-muted-foreground">
                                {description}
                            </CardContent>
                        </Card>
                    ) : null}
                    {pressEmail ? (
                        <Card className="gap-2">
                            <CardHeader>
                                <CardTitle>
                                    <h2 className="text-base">Media contact</h2>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-base leading-7 text-muted-foreground">
                                For media inquiries, email{' '}
                                <a href={`mailto:${pressEmail}`} className={LINK_CLASS}>
                                    {pressEmail}
                                </a>
                            </CardContent>
                        </Card>
                    ) : null}
                </div>
            ) : null}
        </>
    );
}
