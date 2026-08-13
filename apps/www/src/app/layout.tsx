import type {Metadata, Viewport} from 'next';
import {Suspense} from 'react';
import {draftMode} from 'next/headers';
// Loads the actual 'Geist Variable' font family referenced by --font-geist-sans
// in @pakfactory/ui globals (same package the POC uses).
import '@fontsource-variable/geist';
import {GoogleTagManager} from '@next/third-parties/google';
import {TooltipProvider} from '@pakfactory/ui/components/tooltip';
import {SanityVisualEditing} from '@/components/layout/sanity-visual-editing';
import {VirtualPageviewTracker} from '@/components/modules/analytics/virtual-pageview-tracker';
import {buildFaviconIcons} from '@pakfactory/sanity/favicon';
import {WatermarkProvider} from '@pakfactory/components/ui/watermark-context';
import {fetchWwwGlobalSettings} from '@/lib/www-global-settings';
import {toWatermarkConfig} from '@/lib/watermark';
import './globals.css';

export const viewport: Viewport = {
    themeColor: '#1d2058',
};

/**
 * Icons come from Global Settings (PROD-2200), so the head is built here rather
 * than exported as a static `metadata` object. There is deliberately NO
 * `app/favicon.ico`: file-based metadata outranks `generateMetadata`, so the
 * bundled file would win over the editor's upload — it lives in `public/`
 * instead and is the fallback when no favicon is configured.
 */
export async function generateMetadata(): Promise<Metadata> {
    const globalSettings = await fetchWwwGlobalSettings();
    return {
        title: 'PakFactory',
        description: 'Custom packaging, simplified.',
        robots: { index: false, follow: false },
        icons: buildFaviconIcons(globalSettings?.favicon, '/favicon.ico'),
    };
}

/** Inject GTM only in production when Global Settings has a container ID. */
function resolveGtmId(gtmId: string | null | undefined): string | null {
    if (!gtmId?.trim()) return null;
    // Unset locally; preview/development on Vercel must not hit the prod container.
    if (process.env.VERCEL_ENV !== 'production') return null;
    return gtmId.trim();
}

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const isDraft = (await draftMode()).isEnabled;
    const globalSettings = await fetchWwwGlobalSettings();
    const gtmId = resolveGtmId(globalSettings?.gtmId);
    const watermark = toWatermarkConfig(globalSettings?.watermark, '/api/wm');
    return (
        <html lang="en" className="scroll-smooth">
            {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}
            <body className="antialiased">
                <WatermarkProvider value={watermark}>
                <Suspense fallback={null}>
                    <VirtualPageviewTracker />
                </Suspense>
                <TooltipProvider>
                    {children}
                </TooltipProvider>
                {isDraft ? <SanityVisualEditing /> : null}
                </WatermarkProvider>
            </body>
        </html>
    );
}
