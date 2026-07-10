import type {Metadata, Viewport} from 'next';
import {draftMode} from 'next/headers';
import {TooltipProvider} from '@pakfactory/ui/components/tooltip';
import {SanityVisualEditing} from '@/components/layout/sanity-visual-editing';
import './globals.css';

export const viewport: Viewport = {
    themeColor: '#1d2058',
};

export const metadata: Metadata = {
    title: 'PakFactory',
    description: 'Custom packaging, simplified.',
    robots: { index: false, follow: true },
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const isDraft = (await draftMode()).isEnabled;
    return (
        <html lang="en" className="scroll-smooth">
            <body className="antialiased">
                <TooltipProvider>
                    {children}
                </TooltipProvider>
                {isDraft && <SanityVisualEditing />}
            </body>
        </html>
    );
}
