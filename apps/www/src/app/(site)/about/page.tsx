import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {ContentPageView} from '@/components/content/content-page-view';
import {contentPageMetadata} from '@/lib/content-page-metadata';
import {getContentPageById} from '@/lib/content-pages';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
    const page = await getContentPageById('aboutPage');
    if (!page) {
        return {title: 'About'};
    }
    return contentPageMetadata(page);
}

export default async function AboutPage() {
    const page = await getContentPageById('aboutPage');
    if (!page) notFound();
    return <ContentPageView page={page} />;
}
