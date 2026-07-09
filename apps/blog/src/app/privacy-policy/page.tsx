import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import type {PortableTextBlock} from '@portabletext/types';
import {PageDielineSection} from '@/components/layout/page-dieline-section';
import {PageHeader} from '@/components/modules/page-header';
import {PortableText} from '@/components/ui/portable-text';
import {getSanityClient} from '@/lib/sanity/client';
import {robotsDirectiveToMetadata} from '@/lib/seo';
import {absoluteUrl} from '@/lib/site';

export const revalidate = 60;

const PAGE_TITLE = 'Privacy Policy';

type PrivacyPolicy = {
    body?: PortableTextBlock[];
    metaTitle?: string;
    metaDescription?: string;
};

const QUERY = `*[_type == "privacyPolicy"][0]{
  body,
  metaTitle,
  metaDescription
}`;

async function getPrivacyPolicy(): Promise<PrivacyPolicy | null> {
    const client = await getSanityClient();
    return client.fetch<PrivacyPolicy | null>(QUERY);
}

export async function generateMetadata(): Promise<Metadata> {
    const doc = await getPrivacyPolicy();
    const canonical = absoluteUrl('/privacy-policy');
    const title = doc?.metaTitle || PAGE_TITLE;
    const description =
        doc?.metaDescription ||
        'How PakFactory collects, uses, and protects your personal data.';

    return {
        title,
        description,
        robots: robotsDirectiveToMetadata({index: true, follow: true}),
        alternates: {canonical},
        openGraph: {title, description, url: canonical, type: 'website'},
        twitter: {card: 'summary', title, description},
    };
}

export default async function PrivacyPolicyPage() {
    const doc = await getPrivacyPolicy();
    const hasBody = !!doc?.body?.length;

    // No published policy yet: in production 404 (don't index an empty legal
    // page); in dev render a placeholder so the route is visible while authoring.
    if (!hasBody && process.env.NODE_ENV === 'production') notFound();

    return (
        <main>
            <PageHeader title={PAGE_TITLE} />
            <PageDielineSection innerClassName="py-12 sm:py-16">
                <div className="max-w-5xl mx-auto">
                    {hasBody ? (
                        <PortableText
                            value={doc!.body}
                            className="text-base text-foreground"
                        />
                    ) : (
                        <p className="text-base text-muted-foreground">
                            This privacy policy hasn&apos;t been published yet.
                            Add and <strong>publish</strong> it in Sanity Studio
                            under Marketing Website &rarr; Static Pages &rarr;
                            Legal &rarr; Privacy Policy.
                        </p>
                    )}
                </div>
            </PageDielineSection>
        </main>
    );
}
