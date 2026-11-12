import type {Metadata} from 'next';
import Link from 'next/link';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {StaticPageWideBody} from '@/components/common/static-page-body';
import {robotsDirectiveToMetadata} from '@/lib/seo';
import {buildWwwSitemapGroups} from '@/lib/www-sitemap';
import {WWW_ROUTES} from '@/lib/www-routes';

export const revalidate = 300;

export const metadata: Metadata = {
    title: 'Sitemap',
    description: 'A list of PakFactory marketing pages.',
    robots: robotsDirectiveToMetadata({index: true, follow: true}),
};

export default async function HtmlSitemapPage() {
    const groups = await buildWwwSitemapGroups();

    return (
        <main className="min-h-screen bg-background">
            <PageBreadcrumbSection
                items={[
                    {label: 'Home', href: WWW_ROUTES.home},
                    {label: 'Sitemap'},
                ]}
            />
            <PageHeadingSection
                title="Sitemap"
                description="Browse PakFactory pages by section."
            />
            <StaticPageWideBody>
                <div className="flex flex-col gap-16">
                    {groups.map((group) => (
                        <section key={group.title}>
                            <h2 className="text-lg font-semibold tracking-tight text-foreground">
                                {group.title}
                            </h2>
                            <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                                {group.links.map((link) => (
                                    <li key={link.href}>
                                        <Link
                                            href={link.href}
                                            className="text-sm text-foreground hover:underline hover:underline-offset-4"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            </StaticPageWideBody>
        </main>
    );
}
