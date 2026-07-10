import Link from 'next/link';
import {Box} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {PageDielineSection} from '@/components/layout/page-dieline-section';
import {SiteNavCategories} from '@/components/layout/site-nav-categories';
import {
    SiteNavCompactActions,
    SiteNavCompactProvider,
    SiteNavTopRow,
} from '@/components/layout/site-nav-compact';
import type {BlogCategoryChip} from '@/lib/blog-categories';
import {READING_PROGRESS_SLOT_ID} from '@/lib/reading-progress';

const CONTACT_HREF = '/contribute';

type SiteNavProps = {
    categories: BlogCategoryChip[];
};

export function SiteNav({categories}: SiteNavProps) {
    return (
        <header className="sticky -top-0 z-40 lg:-top-16">
            {/* Top tier — PakFactory brand + Blog label + Contact CTA / compact tools */}
            <div className="bg-background">
                <SiteNavCompactProvider
                    categories={categories}
                    contactHref={CONTACT_HREF}
                >
                    <SiteNavTopRow>
                        <Link
                            href="/"
                            className="flex shrink-0 items-center gap-2 no-underline"
                        >
                            <Box
                                className="size-7 text-foreground"
                                strokeWidth={1.75}
                                aria-hidden
                            />
                            <span className="text-[15px] font-semibold tracking-tight text-foreground lg:text-xl">
                                PakFactory
                            </span>
                            <span className="text-[15px] font-medium tracking-tight text-muted-foreground lg:text-xl">
                                Blog
                            </span>
                        </Link>

                        <Button
                            className="hidden h-10 rounded-full bg-primary px-6 text-base font-medium text-white hover:bg-primary/90 lg:inline-flex"
                            asChild
                        >
                            <Link href={CONTACT_HREF}>Contact Us</Link>
                        </Button>

                        <SiteNavCompactActions />
                    </SiteNavTopRow>
                </SiteNavCompactProvider>
            </div>

            {/* Bottom tier — category navigation + search (desktop only) */}
            <div className="bg-background">
                <div className="hidden border-b border-dashed border-border lg:block">
                    <PageDielineSection innerClassName="flex h-16 items-center">
                        <SiteNavCategories categories={categories} />
                    </PageDielineSection>
                </div>
                <PageDielineSection innerClassName="px-0">
                    <div
                        id={READING_PROGRESS_SLOT_ID}
                        className="pointer-events-none w-full"
                        aria-hidden
                    />
                </PageDielineSection>
            </div>
        </header>
    );
}
