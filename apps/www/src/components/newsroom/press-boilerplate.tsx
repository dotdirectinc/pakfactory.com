import {PortableText, type PortableTextComponents} from '@portabletext/react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@pakfactory/ui/components/card';

import {NEWS_LINK_MARKS} from '@/components/newsroom/news-portable-text';
import type {NewsPressContact} from '@/lib/newsroom/types';

const LINK_CLASS =
    'font-medium text-foreground underline underline-offset-4 hover:no-underline';

const ABOUT_COMPONENTS: PortableTextComponents = {
    block: {normal: ({children}) => <p>{children}</p>},
    marks: NEWS_LINK_MARKS,
};

/**
 * End mark + "About PakFactory" + "Media contact" (PROD-2918). The end mark,
 * the two cards and their headings are fixed here; the copy comes from the
 * release's layout template in Studio (Newsroom Detail Page), falling back to
 * the standard copy — so it is edited once for every release, never per
 * release.
 */
export function PressBoilerplate({contact}: {contact: NewsPressContact}) {
    return (
        <>
            <p
                className="my-10 text-center text-sm tracking-[0.3em] text-muted-foreground"
                aria-hidden
            >
                ###
            </p>
            <div className="flex flex-col gap-4">
                <Card className="gap-2">
                    <CardHeader>
                        <CardTitle>
                            <h2 className="text-base">About PakFactory</h2>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 text-base leading-7 text-muted-foreground">
                        <PortableText
                            value={contact.about}
                            components={ABOUT_COMPONENTS}
                        />
                    </CardContent>
                </Card>
                <Card className="gap-2">
                    <CardHeader>
                        <CardTitle>
                            <h2 className="text-base">Media contact</h2>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-base leading-7 text-muted-foreground">
                        {contact.mediaText}{' '}
                        <a href={`mailto:${contact.mediaEmail}`} className={LINK_CLASS}>
                            {contact.mediaEmail}
                        </a>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
