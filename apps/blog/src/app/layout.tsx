import type {Metadata} from 'next';
import {draftMode} from 'next/headers';
import {GeistSans} from 'geist/font/sans';
import {VisualEditing} from 'next-sanity/visual-editing';
import {SiteFooter} from '@/components/layout/site-footer';
import {SiteNav} from '@/components/layout/site-nav';
import {fetchBlogFooterNavigation, fetchBlogNavCategories} from '@/lib/blog-data';
import {sitePath} from '@/lib/site';
import './globals.css';

export const revalidate = 60;

export const metadata: Metadata = {
    title: 'PakFactory Blog',
    description: 'Packaging insights, guides, and stories.',
    alternates: {
        types: {
            'application/rss+xml': [
                {
                    url: sitePath('/rss.xml'),
                    title: 'PakFactory Blog',
                },
            ],
        },
    },
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const isDraft = (await draftMode()).isEnabled;
    const [navCategories, footerColumns] = await Promise.all([
        fetchBlogNavCategories(),
        fetchBlogFooterNavigation(),
    ]);
    return (
        <html lang="en" className={GeistSans.variable}>
            <body className="antialiased">
                <SiteNav categories={navCategories} />
                {children}
                <SiteFooter columns={footerColumns} />
                {isDraft && <VisualEditing />}
            </body>
        </html>
    );
}
