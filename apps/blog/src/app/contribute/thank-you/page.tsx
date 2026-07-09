import type {Metadata} from 'next';
import Link from 'next/link';
import {CircleCheckBig} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {Breadcrumb} from '@/components/layout/breadcrumb';
import {
    breadcrumbList,
    jsonLdGraph,
    serializeJsonLd,
    webPage,
} from '@pakfactory/seo';
import {robotsDirectiveToMetadata} from '@/lib/seo';
import {absoluteUrl} from '@/lib/site';

const PAGE_TITLE = 'Contribute to Our Blog';
const PAGE_DESCRIPTION =
    'Write for the PakFactory blog. We publish guest articles for the people who specify, design, and source custom packaging — brand owners, designers, and packaging teams. Pitch your idea below.';

export async function generateMetadata(): Promise<Metadata> {
    const canonical = absoluteUrl('/contribute/thank-you');

    return {
        title: 'Pitch received — PakFactory Blog',
        description: PAGE_DESCRIPTION,
        robots: robotsDirectiveToMetadata({index: false, follow: true}),
        alternates: {canonical},
    };
}

export default function ContributeThankYouPage() {
    const pageUrl = absoluteUrl('/contribute/thank-you');
    const jsonLd = serializeJsonLd(
        jsonLdGraph([
            webPage({
                name: 'Pitch received — PakFactory Blog',
                url: pageUrl,
                description: PAGE_DESCRIPTION,
            }),
            breadcrumbList([
                {name: 'Blog', url: absoluteUrl('/')},
                {name: 'Contribute', url: absoluteUrl('/contribute')},
                {name: 'Thank you', url: pageUrl},
            ]),
        ]),
    );

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{__html: jsonLd}}
            />
            <main className="mx-auto max-w-6xl px-6 py-10">
                <div className="mb-10">
                    <Breadcrumb
                        items={[
                            {label: 'Blog', href: '/'},
                            {label: 'Contribute', href: '/contribute'},
                            {label: 'Thank you'},
                        ]}
                    />
                    <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                        {PAGE_TITLE}
                    </h1>
                    <p className="mt-2 max-w-2xl text-muted-foreground">
                        {PAGE_DESCRIPTION}
                    </p>
                </div>

                <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-10 text-center shadow-sm">
                    <CircleCheckBig
                        className="mx-auto mb-6 size-14 text-green-600 dark:text-green-500"
                        strokeWidth={1.5}
                    />
                    <h2 className="text-3xl font-semibold tracking-tight">
                        Pitch received — thank you
                    </h2>
                    <p className="mt-3 text-muted-foreground">
                        We read every pitch and reply within 5 business days.
                        Keep an eye on your inbox, and your spam folder, just in
                        case.
                    </p>
                    <div className="mt-8">
                        <Button variant="outline" asChild>
                            <Link href="/">← Back to the blog</Link>
                        </Button>
                    </div>
                </div>
            </main>
        </>
    );
}
