import type {Metadata} from 'next';
import {draftMode} from 'next/headers';
import {GeistSans} from 'geist/font/sans';
import {Inter} from 'next/font/google';
import {GoogleTagManager} from '@next/third-parties/google';
import {VisualEditing} from 'next-sanity/visual-editing';
import {AppToaster} from '@/components/common/app-toaster';
import {EnvBadge} from '@/components/layout/env-badge';
import {SiteFooter} from '@/components/layout/site-footer';
import {SiteNav} from '@/components/layout/site-nav';
import {fetchBlogFooterNavigation, fetchBlogNavCategories} from '@/lib/blog-data';
import {fetchBlogGlobalSettings} from '@/lib/blog-global-settings';
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

/** Inject GTM only in production when Global Settings has a container ID. */
function resolveGtmId(gtmId: string | null | undefined): string | null {
    if (!gtmId?.trim()) return null;
    // Unset locally; preview/development on Vercel must not hit the prod container.
    if (process.env.VERCEL_ENV !== 'production') return null;
    return gtmId.trim();
}

/** Staging/preview → Staging; local next dev (no VERCEL_ENV) → Local; prod → null. */
function resolveEnvBadgeLabel(): 'Staging' | 'Local' | null {
    if (process.env.VERCEL_ENV === 'production') return null;
    return process.env.VERCEL_ENV ? 'Staging' : 'Local';
}

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const isDraft = (await draftMode()).isEnabled;
    const [primaryNav, footerData, globalSettings] = await Promise.all([
        fetchBlogNavCategories(),
        fetchBlogFooterNavigation(),
        fetchBlogGlobalSettings(),
    ]);
    const gtmId = resolveGtmId(globalSettings?.gtmId);
    const envLabel = resolveEnvBadgeLabel();
    return (
        <html lang="en" className={`${GeistSans.variable} ${inter.variable}`}>
            {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}
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
                {envLabel ? <EnvBadge label={envLabel} /> : null}
            </body>
        </html>
    );
}
