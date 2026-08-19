import type {Metadata} from 'next';
import Link from 'next/link';
import {WWW_ROUTES} from '@/lib/www-routes';
import {robotsDirectiveToMetadata} from '@/lib/seo';

export const metadata: Metadata = {
    title: 'Page not found',
    robots: robotsDirectiveToMetadata({index: false, follow: false}),
};

export default function NotFound() {
    return (
        <main className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
            <p className="mt-4 text-muted-foreground">
                That URL isn’t a page on this site.
            </p>
            <p className="mt-6">
                <Link href={WWW_ROUTES.home} className="underline">
                    Back to home
                </Link>
            </p>
        </main>
    );
}
