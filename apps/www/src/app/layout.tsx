import type {Metadata} from 'next';
import {draftMode} from 'next/headers';
import SiteNav from '@/components/layout/site-nav';
import {TooltipProvider} from '@pakfactory/ui/components/tooltip';
import {SanityVisualEditing} from '@/components/common/sanity-visual-editing';
import './globals.css';

export const metadata: Metadata = {
    title: 'PakFactory',
    description: 'Custom packaging, simplified.',
    robots: { index: false, follow: true },
};

const navItems = [
    // { title: "Home", href: "/" },
    {title: 'Products', href: '/products'},
    {title: 'Capabilities', href: '/capabilities'},
    // { title: "Contact", href: "#" },
];

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
                    <SiteNav navigationData={navItems} />
                    {children}
                </TooltipProvider>
                {isDraft && <SanityVisualEditing />}
            </body>
        </html>
    );
}
