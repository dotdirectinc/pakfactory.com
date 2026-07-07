import Link from 'next/link';
import {Button} from '@pakfactory/ui/components/button';
import {PageDielineSection} from '@/components/layout/page-dieline-section';
import {SiteNavCategories} from '@/components/layout/site-nav-categories';
import {
    SiteNavCompactActions,
    SiteNavCompactProvider,
} from '@/components/layout/site-nav-compact';
import type {BlogCategoryChip} from '@/lib/blog-categories';
import {READING_PROGRESS_SLOT_ID} from '@/lib/reading-progress';
import {getWwwUrl} from '@/lib/site';

const QUOTE_HREF = `${getWwwUrl()}/contact`;

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
                    contactHref={QUOTE_HREF}
                >
                    <PageDielineSection innerClassName="flex h-16 items-center justify-between border-b border-dashed border-border">
                        <div className="flex shrink-0 items-center gap-2">
                            <Link
                                href={getWwwUrl()}
                                className="flex items-center gap-3 no-underline"
                            >
                                <span className="flex size-8 items-center justify-center rounded-md bg-foreground text-xs font-bold text-background">
                                    PF
                                </span>
                                <span className="text-[15px] font-semibold tracking-tight text-foreground lg:text-xl">
                                    PakFactory
                                </span>
                            </Link>
                            <Link
                                href="/"
                                className="text-[15px] font-semibold tracking-tight text-foreground no-underline lg:text-xl"
                            >
                                Blog
                            </Link>
                        </div>

                        <Button
                            className="hidden h-10 rounded-full bg-primary px-6 text-base font-medium text-white hover:bg-primary/90 lg:inline-flex"
                            asChild
                        >
                            <a href={QUOTE_HREF}>Contact Us</a>
                        </Button>

                        <SiteNavCompactActions />
                    </PageDielineSection>
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
