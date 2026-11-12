import type {Metadata} from 'next';
import {formatDateTime} from '@pakfactory/utilities/date-time';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {
    StaticPageBody,
    StaticPageLinkList,
} from '@/components/common/static-page-body';
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
            const lastUpdated = page.lastUpdated?.trim() || null;
            return {
                href,
                label: page.title?.trim() || 'Policy',
                description: lastUpdated
                    ? `Last updated ${formatDateTime(lastUpdated, 'longDate')}`
                    : null,
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
            <StaticPageBody as="section">
                {links.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No policies are published yet.
                    </p>
                ) : (
                    <StaticPageLinkList items={links} />
                )}
            </StaticPageBody>
        </main>
    );
}
