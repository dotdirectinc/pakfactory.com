import type {Metadata} from 'next';
import Link from 'next/link';
import {formatDateTime} from '@pakfactory/utilities/date-time';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {legalPageHref, listLegalPages} from '@/lib/legal-pages';
import {robotsDirectiveToMetadata} from '@/lib/seo';
import {WWW_ROUTES} from '@/lib/www-routes';

export const revalidate = 60;

export const metadata: Metadata = {
    title: 'Policies',
    description: 'PakFactory privacy policy, terms of service, and related legal pages.',
    robots: robotsDirectiveToMetadata({index: true, follow: true}),
};

export default async function PoliciesPage() {
    const pages = await listLegalPages();
    const links = pages
        .map((page) => {
            const href = legalPageHref(page._id);
            if (!href) return null;
            return {
                href,
                title: page.title?.trim() || 'Policy',
                lastUpdated: page.lastUpdated?.trim() || null,
            };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    return (
        <main className="min-h-screen bg-background">
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Policies'},
                ]}
            />
            <PageHeadingSection
                title="Policies"
                description="Legal documents that apply to using PakFactory."
            />
            <section className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
                {links.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No policies are published yet.
                    </p>
                ) : (
                    <ul className="space-y-4">
                        {links.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className="text-lg font-medium text-foreground underline underline-offset-4 hover:no-underline"
                                >
                                    {item.title}
                                </Link>
                                {item.lastUpdated ? (
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Last updated{' '}
                                        {formatDateTime(
                                            item.lastUpdated,
                                            'longDate',
                                        )}
                                    </p>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}
