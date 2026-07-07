'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useId,
    useRef,
    useState,
    type ReactNode,
    type RefObject,
} from 'react';
import Link from 'next/link';
import {ArrowRight, Menu, Search, X} from 'lucide-react';
import {usePathname} from 'next/navigation';
import {Button} from '@pakfactory/ui/components/button';
import {NavSearchForm} from '@/components/modules/search-form';
import {cn} from '@pakfactory/ui/lib/utils';
import {
    pageDielineInnerClass,
    pageDielineOuterClass,
} from '@/components/layout/page-dieline-section';
import type {BlogCategoryChip} from '@/lib/blog-categories';
import {categoryHref} from '@/lib/blog-post-url';

type SiteNavCompactContextValue = {
    searchOpen: boolean;
    menuOpen: boolean;
    toggleSearch: () => void;
    toggleMenu: () => void;
    closeMenu: () => void;
    searchRowId: string;
    menuId: string;
    menuTriggerRef: RefObject<HTMLButtonElement | null>;
};

const SiteNavCompactContext = createContext<SiteNavCompactContextValue | null>(
    null,
);

function useSiteNavCompact() {
    const context = useContext(SiteNavCompactContext);
    if (!context) {
        throw new Error(
            'SiteNavCompact components must be used within SiteNavCompactProvider',
        );
    }
    return context;
}

type SiteNavCompactSearchOverlayProps = {
    searchOpen: boolean;
    searchRowId: string;
    onClose: () => void;
};

function SiteNavCompactSearchOverlay({
    searchOpen,
    searchRowId,
    onClose,
}: SiteNavCompactSearchOverlayProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!searchOpen) return;
        inputRef.current?.focus();
    }, [searchOpen]);

    if (!searchOpen) return null;

    return (
        <>
            <button
                type="button"
                className="fixed inset-x-0 top-16 bottom-0 z-50 animate-in bg-black/20 fade-in-0 duration-300 lg:hidden"
                aria-hidden
                tabIndex={-1}
                onClick={onClose}
            />
            <div
                id={searchRowId}
                role="search"
                className="fixed inset-x-0 top-16 z-50 animate-in border-b border-dashed border-border bg-background  fade-in-0 slide-in-from-top-2 duration-300 lg:hidden"
            >
                <div className={pageDielineOuterClass()}>
                    <div className={pageDielineInnerClass()}>
                        <NavSearchForm
                            id="site-nav-compact-search"
                            inputRef={inputRef}
                            className="pt-2 pb-3"
                            fieldClassName="w-full"
                        />
                    </div>
                </div>
            </div>
        </>
    );
}

type SiteNavCompactProviderProps = {
    categories: BlogCategoryChip[];
    contactHref: string;
    children: ReactNode;
};

export function SiteNavCompactProvider({
    categories,
    contactHref,
    children,
}: SiteNavCompactProviderProps) {
    const [searchOpen, setSearchOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const searchRowId = useId();
    const menuId = useId();
    const menuTriggerRef = useRef<HTMLButtonElement>(null);
    const pathname = usePathname();

    const closeSearch = useCallback(() => {
        setSearchOpen(false);
    }, []);

    const closeMenu = useCallback(() => {
        setMenuOpen(false);
        menuTriggerRef.current?.focus();
    }, []);

    const toggleSearch = useCallback(() => {
        setSearchOpen((previous) => {
            const next = !previous;
            if (next) setMenuOpen(false);
            return next;
        });
    }, []);

    const toggleMenu = useCallback(() => {
        setMenuOpen((previous) => {
            const next = !previous;
            if (next) setSearchOpen(false);
            return next;
        });
    }, []);

    useEffect(() => {
        setSearchOpen(false);
        setMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!searchOpen && !menuOpen) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (searchOpen) setSearchOpen(false);
            if (menuOpen) closeMenu();
        };

        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [searchOpen, menuOpen, closeMenu]);

    useEffect(() => {
        if (!menuOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [menuOpen]);

    return (
        <SiteNavCompactContext.Provider
            value={{
                searchOpen,
                menuOpen,
                toggleSearch,
                toggleMenu,
                closeMenu,
                searchRowId,
                menuId,
                menuTriggerRef,
            }}
        >
            {children}

            <SiteNavCompactSearchOverlay
                searchOpen={searchOpen}
                searchRowId={searchRowId}
                onClose={closeSearch}
            />

            {menuOpen ? (
                <div
                    id={menuId}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Blog navigation"
                    className="fixed inset-x-0 top-16 bottom-0 z-50 bg-background lg:hidden"
                >
                    <div className={pageDielineOuterClass('h-full')}>
                        <div
                            className={cn(
                                pageDielineInnerClass(),
                                'flex h-full flex-col justify-between py-8',
                            )}
                        >
                            {categories.length > 0 ? (
                                <nav
                                    aria-label="Blog categories"
                                    className="flex flex-col gap-12"
                                >
                                    {categories.map(({slug, title}) => {
                                        const href = categoryHref(slug);
                                        const isActive =
                                            pathname === href ||
                                            pathname.startsWith(
                                                `${href}/page/`,
                                            );

                                        return (
                                            <Link
                                                key={slug}
                                                href={href}
                                                onClick={closeMenu}
                                                className={cn(
                                                    'flex items-center justify-between text-xl font-medium text-foreground no-underline',
                                                    isActive && 'text-primary',
                                                )}
                                            >
                                                {title}
                                                <ArrowRight
                                                    className="size-6 shrink-0"
                                                    strokeWidth={1.75}
                                                    aria-hidden
                                                />
                                            </Link>
                                        );
                                    })}
                                </nav>
                            ) : (
                                <div />
                            )}

                            <Button asChild>
                                <a href={contactHref}>Contact Us</a>
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </SiteNavCompactContext.Provider>
    );
}

export function SiteNavCompactActions() {
    const {
        searchOpen,
        menuOpen,
        toggleSearch,
        toggleMenu,
        searchRowId,
        menuId,
        menuTriggerRef,
    } = useSiteNavCompact();

    return (
        <div className="flex items-center gap-3 lg:hidden">
            <Button
                variant="ghost"
                size="icon"
                className="size-9"
                aria-expanded={searchOpen}
                aria-controls={searchRowId}
                aria-label={searchOpen ? 'Close search' : 'Search blog'}
                onClick={toggleSearch}
            >
                {searchOpen ? (
                    <X className="size-[22px]" strokeWidth={1.75} />
                ) : (
                    <Search className="size-[22px]" strokeWidth={1.75} />
                )}
            </Button>

            <Button
                ref={menuTriggerRef}
                variant="outline"
                size="icon"
                className="size-9 shadow-xs"
                aria-expanded={menuOpen}
                aria-controls={menuId}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                onClick={toggleMenu}
            >
                <Menu className="size-4" />
            </Button>
        </div>
    );
}
