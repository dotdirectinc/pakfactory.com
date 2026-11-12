import type {Metadata} from 'next';
import Link from 'next/link';
import {PageBreadcrumbSection} from '@/components/common/page-breadcrumb-section';
import {PageHeadingSection} from '@/components/common/page-heading-section';
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
            <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 pb-16 sm:px-6 md:grid-cols-2">
                {groups.map((group) => (
                    <section key={group.title}>
                        <h2 className="text-lg font-semibold tracking-tight text-foreground">
                            {group.title}
                        </h2>
                        <ul className="mt-4 space-y-2">
                            {group.links.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-foreground underline underline-offset-4 hover:no-underline"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </main>
    );
}
