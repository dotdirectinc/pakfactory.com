import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {ContentPageView} from '@/components/content/content-page-view';
import {contentPageMetadata} from '@/lib/content-page-metadata';
import {getContentPageById} from '@/lib/content-pages';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
    const page = await getContentPageById('contactPage');
    if (!page) {
        return {title: 'Contact'};
    }
    return contentPageMetadata(page);
}

export default async function ContactPage() {
    const page = await getContentPageById('contactPage');
    if (!page) notFound();

    // Hub lives in a `contactDirectory` section (Sections tab). Other bands
    // (FAQ, CTA, …) follow in the same sections array.
    return <ContentPageView page={page} />;
}
