import type {Metadata} from 'next';
import Link from 'next/link';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {WWW_ROUTES} from '@/lib/www-routes';
import {robotsDirectiveToMetadata} from '@/lib/seo';

export const metadata: Metadata = {
    title: 'Page not found',
    robots: robotsDirectiveToMetadata({index: false, follow: false}),
};

export default function NotFound() {
    return (
        <main className="min-h-screen bg-background">
            <PageHeadingSection
                title="Page not found"
                description="That URL isn’t a page on this site."
            >
                <p className="mt-2">
                    <Link href={WWW_ROUTES.home} className="underline">
                        Back to home
                    </Link>
                </p>
            </PageHeadingSection>
        </main>
    );
}
