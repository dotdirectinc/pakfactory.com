import type {Metadata} from 'next';
import {Suspense} from 'react';
import {draftMode} from 'next/headers';
// Self-host the 'Geist Variable' family that packages/ui globals.css references
// via --font-geist-sans (same mechanism as apps/www). Do NOT use next/font's
// `geist/font/sans`: it publishes --font-geist-sans under a hashed family name
// that competes with the globals `:root` value, so whichever wins the cascade is
// non-deterministic — and the 'Geist Variable' @font-face was never registered,
// leaving machines without Geist installed on the system-font fallback (PROD-2010).
import '@fontsource-variable/geist';
import {Inter} from 'next/font/google';
import {GoogleTagManager} from '@next/third-parties/google';
import {VisualEditing} from 'next-sanity/visual-editing';
import {AppToaster} from '@/components/common/app-toaster';
import {EnvBadge} from '@/components/layout/env-badge';
import {SiteFooter} from '@/components/layout/site-footer';
import {SiteNav} from '@/components/layout/site-nav';
import {VirtualPageviewTracker} from '@/components/modules/analytics/virtual-pageview-tracker';
import {fetchBlogFooterNavigation, fetchBlogNavCategories} from '@/lib/blog-data';
import {fetchBlogGlobalSettings} from '@/lib/blog-global-settings';
import {toWatermarkConfig} from '@/lib/watermark';
import {WatermarkProvider} from '@pakfactory/components/ui/watermark-context';
import {absoluteUrl, sitePath} from '@/lib/site';
import './globals.css';

export const revalidate = 60;

// Inter — used for widget captions (Figma spec).
const inter = Inter({subsets: ['latin'], variable: '--font-inter'});

export const metadata: Metadata = {
    title: 'PakFactory Blog',
    description: 'Packaging insights, guides, and stories.',
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
    const watermark = toWatermarkConfig(
        globalSettings?.watermark,
        sitePath('/api/wm'),
    );
    return (
        <html lang="en" className={inter.variable}>
            {/*
             * RSS autodiscovery (PROD-2193). Rendered as a real <link> — which
             * React hoists into <head> on every route — rather than via the
             * Metadata API `alternates.types`. Per-page metadata sets
             * `alternates: { canonical }` (resolve-seo.ts → buildDocMetadata),
             * and Next.js overrides the whole `alternates` object per segment
             * (shallow, not deep-merged), so a layout-level `alternates.types`
             * was silently dropped on post / category / author / home pages.
             * `absoluteUrl('/rss.xml')` emits a full URL (metadataBase is unset)
             * → https://pakfactory.com/blog/rss.xml in production.
             */}
            <link
                rel="alternate"
                type="application/rss+xml"
                title="PakFactory Blog"
                href={absoluteUrl('/rss.xml')}
            />
            {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}
            <body className="antialiased">
                <WatermarkProvider value={watermark}>
                <AppToaster />
                <Suspense fallback={null}>
                    <VirtualPageviewTracker />
                </Suspense>
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
                </WatermarkProvider>
            </body>
        </html>
    );
}
