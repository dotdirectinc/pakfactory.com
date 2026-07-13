import type {Metadata} from 'next';
import {draftMode} from 'next/headers';
import {GeistSans} from 'geist/font/sans';
import {Inter} from 'next/font/google';
import {VisualEditing} from 'next-sanity/visual-editing';
import {AppToaster} from '@/components/common/app-toaster';
import {SiteFooter} from '@/components/layout/site-footer';
import {SiteNav} from '@/components/layout/site-nav';
import {fetchBlogFooterNavigation, fetchBlogNavCategories} from '@/lib/blog-data';
import {sitePath} from '@/lib/site';
import './globals.css';

export const revalidate = 60;

// Inter — used for widget captions (Figma spec).
const inter = Inter({subsets: ['latin'], variable: '--font-inter'});

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
    const [primaryNav, footerData] = await Promise.all([
        fetchBlogNavCategories(),
        fetchBlogFooterNavigation(),
    ]);
    return (
        <html lang="en" className={`${GeistSans.variable} ${inter.variable}`}>
            <body className="antialiased">
                <AppToaster />
                <SiteNav
                    navItems={primaryNav.navItems}
                    header={primaryNav.header}
                />
                {children}
                <SiteFooter
                    columns={footerData.columns}
                    social={footerData.social}
                    aiLinks={footerData.aiLinks}
                    builder={footerData.builder}
                />
                {isDraft && <VisualEditing />}
            </body>
        </html>
    );
}
