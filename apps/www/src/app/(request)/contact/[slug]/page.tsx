import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {ContactEnquiryFlow} from '@/components/contact/contact-enquiry-flow';
import {
    collectContactChannelsFromSections,
    findContactEnquiry,
    listContactEnquirySlugs,
    listContactEnquiryTopics,
} from '@/lib/contact/map-channels';
import {getContentPageById} from '@/lib/content-pages';

export const revalidate = 60;

type ContactEnquiryPageProps = {
    params: Promise<{slug: string}>;
};

export async function generateStaticParams() {
    const page = await getContentPageById('contactPage');
    const channels = collectContactChannelsFromSections(page?.sections);
    return listContactEnquirySlugs(channels).map((slug) => ({slug}));
}

export async function generateMetadata({
    params,
}: ContactEnquiryPageProps): Promise<Metadata> {
    const {slug} = await params;
    const page = await getContentPageById('contactPage');
    const channels = collectContactChannelsFromSections(page?.sections);
    const enquiry = findContactEnquiry(channels, slug);
    return {
        title: enquiry?.title ?? 'Contact',
        robots: {index: false, follow: false},
    };
}

export default async function ContactEnquiryPage({
    params,
}: ContactEnquiryPageProps) {
    const {slug} = await params;
    const page = await getContentPageById('contactPage');
    const channels = collectContactChannelsFromSections(page?.sections);
    const enquiry = findContactEnquiry(channels, slug);
    if (!enquiry) notFound();
    const topics = listContactEnquiryTopics(channels);
    return <ContactEnquiryFlow enquiry={enquiry} topics={topics} />;
}
