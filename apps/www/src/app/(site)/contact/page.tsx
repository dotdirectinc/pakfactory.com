import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {ContactDetailsBlock} from '@/components/content/contact-details-block';
import {ContentPageView} from '@/components/content/content-page-view';
import {contentPageMetadata} from '@/lib/content-page-metadata';
import {getContentPageById} from '@/lib/content-pages';
import {fetchWwwGlobalSettings} from '@/lib/www-global-settings';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
    const page = await getContentPageById('contactPage');
    if (!page) {
        return {title: 'Contact'};
    }
    return contentPageMetadata(page);
}

export default async function ContactPage() {
    const [page, settings] = await Promise.all([
        getContentPageById('contactPage'),
        fetchWwwGlobalSettings(),
    ]);
    if (!page) notFound();
    return (
        <ContentPageView
            page={page}
            afterSections={<ContactDetailsBlock settings={settings} />}
        />
    );
}
