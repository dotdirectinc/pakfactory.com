'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Bookmark} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {PageDielineSection} from '@pakfactory/ui/components/page-dieline-section';
import {cn} from '@pakfactory/ui/lib/utils';

import {BookmarkGridTile} from '@/components/bookmarks/bookmark-grid-tile';
import {BookmarkSelectionTray} from '@/components/bookmarks/bookmark-selection-tray';
import {PageHeadingSection} from '@/components/common/page-heading-section';
import {CUSTOMIZATION_REFERENCE_WORKS_WITH_ID} from '@/components/customization/customization-reference-works-with';
import {
    CatalogTabBar,
    type CatalogTab,
} from '@/components/ui/catalog-tab-bar';
import {showToastCard} from '@/components/ui/toast-card';
import {useQuickConfigure} from '@/components/quick-configure/quick-configure';
import {
    type BookmarkEntry,
    useBookmarks,
} from '@/lib/bookmarks/bookmarks';
import {useBookmarkAuth} from '@/lib/bookmarks/use-bookmark-auth';
import {useRequest} from '@/lib/request/request-provider';
import {
    customizationCategoryHref,
    WWW_ROUTES,
} from '@/lib/www-routes';

type TabId = 'all' | 'products' | 'customizations';

const CATALOG_GRID_CLASS =
    'grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

function selectionKey(entry: BookmarkEntry): string {
    return `${entry.type}:${entry.id}`;
}

function applyCustomizationEntry(
    entry: BookmarkEntry,
    quick: ReturnType<typeof useQuickConfigure>,
): void {
    if (entry.type !== 'customization') return;
    const category =
        entry.snapshot.categoryValue || entry.id.split('/')[0] || '';
    const slug = entry.id.includes('/')
        ? entry.id.slice(entry.id.indexOf('/') + 1)
        : '';
    if (!category || !slug) return;
    const href = `${customizationCategoryHref(category, slug)}#${CUSTOMIZATION_REFERENCE_WORKS_WITH_ID}`;
    if (quick.enabled) {
        quick.openApply({
            option: {category, slug, title: entry.snapshot.title},
            seeAllHref: href,
        });
        return;
    }
    window.location.assign(href);
}

export function BookmarksView() {
    const pathname = usePathname() || WWW_ROUTES.bookmarks;
    const {canBookmark, pending, loginHref, signUpHref} = useBookmarkAuth();
    const {bookmarks} = useBookmarks();
    const {addLine, lines} = useRequest();
    const quick = useQuickConfigure();
    const [tab, setTab] = useState<TabId>('all');
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
        () => new Set(),
    );

    const products = useMemo(
        () => bookmarks.filter((b) => b.type === 'product'),
        [bookmarks],
    );
    const customizations = useMemo(
        () => bookmarks.filter((b) => b.type === 'customization'),
        [bookmarks],
    );

    const visible = useMemo(() => {
        if (tab === 'products') return products;
        if (tab === 'customizations') return customizations;
        return bookmarks;
    }, [tab, products, customizations, bookmarks]);

    const selected = useMemo(
        () => bookmarks.filter((b) => selectedKeys.has(selectionKey(b))),
        [bookmarks, selectedKeys],
    );

    const tabs: CatalogTab[] = [
        {id: 'all', label: 'All', count: bookmarks.length},
        {id: 'products', label: 'Products', count: products.length},
        {
            id: 'customizations',
            label: 'Customizations',
            count: customizations.length,
        },
    ];

    function toggleSelect(entry: BookmarkEntry) {
        const key = selectionKey(entry);
        setSelectedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    function clearSelection() {
        setSelectedKeys(new Set());
    }

    function handleAddProducts() {
        const productEntries = selected.filter((e) => e.type === 'product');
        if (productEntries.length === 0) return;

        let added = 0;
        let skipped = 0;
        for (const entry of productEntries) {
            if (lines.some((line) => line.productSlug === entry.id)) {
                skipped += 1;
                continue;
            }
            addLine({
                productSlug: entry.id,
                productTitle: entry.snapshot.title,
                ...(entry.snapshot.sku ? {productSku: entry.snapshot.sku} : {}),
                ...(entry.snapshot.productLineTitle
                    ? {productLineTitle: entry.snapshot.productLineTitle}
                    : {}),
                ...(entry.snapshot.moq != null
                    ? {productMoq: entry.snapshot.moq}
                    : {}),
                ...(entry.snapshot.imageUrl
                    ? {
                          productMedia: [
                              {
                                  src: entry.snapshot.imageUrl,
                                  alt:
                                      entry.snapshot.imageAlt ||
                                      entry.snapshot.title,
                              },
                          ],
                      }
                    : {}),
                quantities: [],
                contents: '',
                customizations: [],
            });
            added += 1;
        }

        if (added > 0) {
            showToastCard({
                title:
                    added === 1
                        ? 'Added to request'
                        : `Added ${added} to request`,
                description:
                    skipped > 0
                        ? `${skipped} already in the open request.`
                        : undefined,
                action: {label: 'Quote Request', href: WWW_ROUTES.request},
                dismissLabel: 'Dismiss',
            });
        } else if (skipped > 0) {
            showToastCard({
                title: 'Already in your request',
                description: 'Those products are already in the open request.',
                action: {label: 'Quote Request', href: WWW_ROUTES.request},
                dismissLabel: 'Dismiss',
            });
        }
        clearSelection();
    }

    function handleApplyCustomization() {
        const only = selected.filter((e) => e.type === 'customization');
        if (only.length !== 1) return;
        clearSelection();
        applyCustomizationEntry(only[0]!, quick);
    }

    if (pending) {
        return (
            <PageDielineSection
                paddingBlock="none"
                innerClassName="py-16"
            >
                <p className="text-sm text-muted-foreground">Loading…</p>
            </PageDielineSection>
        );
    }

    if (!canBookmark) {
        return (
            <div>
                <PageHeadingSection
                    title="Bookmarks"
                    description="Sign in or create an account to bookmark products and customizations."
                    align="center"
                    borderBottom={false}
                    settle
                >
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button asChild>
                            <Link href={loginHref(pathname)}>Sign in</Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href={signUpHref(pathname)}>
                                Create an account
                            </Link>
                        </Button>
                    </div>
                </PageHeadingSection>
            </div>
        );
    }

    return (
        <div>
            <PageHeadingSection
                title="Bookmarks"
                description="Products and customizations you bookmarked in this browser."
                borderBottom={false}
                settle
            />
            <PageDielineSection
                paddingBlock="none"
                innerClassName={cn(
                    'pb-28',
                    selected.length > 0 && 'pb-40',
                )}
            >
                <CatalogTabBar
                    tabs={tabs}
                    value={tab}
                    onValueChange={(id) => setTab(id as TabId)}
                    aria-label="Bookmark filters"
                    panelClassName="mt-12"
                >
                    {visible.length === 0 ? (
                        <div className="flex flex-col items-center gap-4 py-16 text-center">
                            <Bookmark className="size-10 text-muted-foreground" />
                            <p className="text-base font-medium">
                                No bookmarks yet
                            </p>
                            <p className="max-w-sm text-sm text-muted-foreground">
                                Bookmark a product or customization from a
                                catalog card or detail page.
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                                <Button asChild variant="outline">
                                    <Link href={WWW_ROUTES.products}>
                                        Browse products
                                    </Link>
                                </Button>
                                <Button asChild variant="outline">
                                    <Link href={WWW_ROUTES.customizations}>
                                        Browse customizations
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <ul className={CATALOG_GRID_CLASS}>
                            {visible.map((entry) => (
                                <BookmarkGridTile
                                    key={selectionKey(entry)}
                                    entry={entry}
                                    selected={selectedKeys.has(
                                        selectionKey(entry),
                                    )}
                                    onToggleSelect={() => toggleSelect(entry)}
                                    onApplyCustomization={() =>
                                        applyCustomizationEntry(entry, quick)
                                    }
                                />
                            ))}
                        </ul>
                    )}
                </CatalogTabBar>
            </PageDielineSection>

            <BookmarkSelectionTray
                selected={selected}
                onRemove={(entry) => {
                    setSelectedKeys((prev) => {
                        const next = new Set(prev);
                        next.delete(selectionKey(entry));
                        return next;
                    });
                }}
                onClear={clearSelection}
                onAddProducts={handleAddProducts}
                onApplyCustomization={handleApplyCustomization}
            />
        </div>
    );
}
