import type {Metadata} from 'next';
import {draftMode} from 'next/headers';
import Navbar from '@/components/common/navbar';
import {TooltipProvider} from '@pakfactory/ui/components/tooltip';
import {VisualEditing} from 'next-sanity/visual-editing';
import './globals.css';

export const metadata: Metadata = {
    title: 'PakFactory',
    description: 'Custom packaging, simplified.',
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
                    <Navbar navigationData={navItems} />
                    {children}
                </TooltipProvider>
                {isDraft && <VisualEditing />}
            </body>
        </html>
    );
}
