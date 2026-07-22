import type {Metadata, Viewport} from 'next';
// Loads the actual 'Geist Variable' font family referenced by --font-geist-sans
// in @pakfactory/ui globals (same package the POC uses).
import '@fontsource-variable/geist';
import {GoogleTagManager} from '@next/third-parties/google';
import {TooltipProvider} from '@pakfactory/ui/components/tooltip';
import {fetchWwwGlobalSettings} from '@/lib/www-global-settings';
import './globals.css';

export const viewport: Viewport = {
    themeColor: '#1d2058',
};

export const metadata: Metadata = {
    title: 'PakFactory',
    description: 'Custom packaging, simplified.',
    robots: { index: false, follow: true },
};

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
    const globalSettings = await fetchWwwGlobalSettings();
    const gtmId = resolveGtmId(globalSettings?.gtmId);
    return (
        <html lang="en" className="scroll-smooth">
            {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}
            <body className="antialiased">
                <TooltipProvider>
                    {children}
                </TooltipProvider>
            </body>
        </html>
    );
}
