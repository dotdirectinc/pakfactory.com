import type {Metadata} from 'next';
import {draftMode} from 'next/headers';
import {GeistSans} from 'geist/font/sans';
import {VisualEditing} from 'next-sanity/visual-editing';
import {SiteFooter} from '@/components/layout/site-footer';
import {SiteNav} from '@/components/layout/site-nav';
import {sitePath} from '@/lib/site';
import './globals.css';

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
    return (
        <html lang="en" className={GeistSans.variable}>
            <body className="antialiased">
                <SiteNav />
                {children}
                <SiteFooter />
                {isDraft && <VisualEditing />}
            </body>
        </html>
    );
}
