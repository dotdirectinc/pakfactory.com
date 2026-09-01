import type {Metadata} from 'next';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {robotsDirectiveToMetadata} from '@/lib/seo';
import {WWW_ROUTES} from '@/lib/www-routes';

type ComingSoonPageProps = {
    title: string;
    note?: string;
};

export function comingSoonMetadata(title: string): Metadata {
    return {
        title,
        robots: robotsDirectiveToMetadata({index: false, follow: false}),
    };
}

export function ComingSoonPage({title, note}: ComingSoonPageProps) {
    return (
        <main className="min-h-screen bg-background">
            <PageBreadcrumbSection
                items={[{label: 'Home', href: WWW_ROUTES.home}, {label: title}]}
            />
            <PageHeadingSection
                title={title}
                description={
                    note ?? 'This page is reserved. Content is coming soon.'
                }
            />
        </main>
    );
}
