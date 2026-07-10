import type {Metadata, Viewport} from 'next';
import {TooltipProvider} from '@pakfactory/ui/components/tooltip';
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
    return (
        <html lang="en" className="scroll-smooth">
            <body className="antialiased">
                <TooltipProvider>
                    {children}
                </TooltipProvider>
            </body>
        </html>
    );
}
