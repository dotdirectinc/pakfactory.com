'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useId,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
    type RefObject,
} from 'react';
import Link from 'next/link';
import {ArrowRight, Search, X} from 'lucide-react';
import {usePathname} from 'next/navigation';
import {Button} from '@pakfactory/ui/components/button';
import {NavSearchForm} from '@/components/modules/search-form';
import {PrimaryNavLink} from '@/components/layout/primary-nav-link';
import {cn} from '@pakfactory/ui/lib/utils';
import {
    PageDielineSection,
    pageDielineInnerClass,
    pageDielineOuterClass,
} from '@/components/layout/page-dieline-section';
import type {BlogPrimaryNavCta, BlogPrimaryNavItem} from '@/lib/blog-primary-nav';
import {externalLinkAttributes} from '@/lib/external-link';

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

type SiteNavTopRowProps = {
    children: ReactNode;
};

export function SiteNavTopRow({children}: SiteNavTopRowProps) {
    const {searchOpen} = useSiteNavCompact();

    return (
        <PageDielineSection
            innerClassName={cn(
                'flex h-16 items-center justify-between',
                searchOpen
                    ? 'lg:border-b lg:border-dashed lg:border-border'
                    : 'border-b border-dashed border-border',
            )}
        >
            {children}
        </PageDielineSection>
    );
}

type SiteNavCompactProviderProps = {
    navItems: BlogPrimaryNavItem[];
    cta: BlogPrimaryNavCta;
    children: ReactNode;
};

export function SiteNavCompactProvider({
    navItems,
    cta,
    children,
}: SiteNavCompactProviderProps) {
    const [searchOpen, setSearchOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [headerBottom, setHeaderBottom] = useState(64);
    const searchRowId = useId();
    const menuId = useId();
    const menuTriggerRef = useRef<HTMLButtonElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const headerShellRef = useRef<HTMLDivElement>(null);
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

    const updateHeaderBottom = useCallback(() => {
        const shell = headerShellRef.current;
        if (!shell) return;
        setHeaderBottom(shell.getBoundingClientRect().bottom);
    }, []);

    useEffect(() => {
        setSearchOpen(false);
        setMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!searchOpen) return;
        searchInputRef.current?.focus();
    }, [searchOpen]);

    useEffect(() => {
        if (!searchOpen) return;

        updateHeaderBottom();

        const shell = headerShellRef.current;
        if (!shell) return;

        const observer = new ResizeObserver(updateHeaderBottom);
        observer.observe(shell);
        window.addEventListener('resize', updateHeaderBottom);
        window.addEventListener('scroll', updateHeaderBottom, {passive: true});

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateHeaderBottom);
            window.removeEventListener('scroll', updateHeaderBottom);
        };
    }, [searchOpen, updateHeaderBottom]);

    useEffect(() => {
        if (!searchOpen && !menuOpen) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (searchOpen) closeSearch();
            if (menuOpen) closeMenu();
        };

        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [searchOpen, menuOpen, closeMenu, closeSearch]);

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
            <div
                ref={headerShellRef}
                style={
                    {
                        '--nav-search-bottom': `${headerBottom}px`,
                    } as CSSProperties
                }
            >
                {children}

                {searchOpen ? (
                    <div className="border-b border-dashed border-border bg-background lg:hidden">
                        <div
                            id={searchRowId}
                            role="search"
                            className={pageDielineOuterClass()}
                        >
                            <div className={pageDielineInnerClass('py-3')}>
                                <NavSearchForm
                                    id="site-nav-compact-search"
                                    inputRef={searchInputRef}
                                    placeholder="Search the blog…"
                                    showSubmit
                                    submitLabel="Search"
                                    fieldClassName="w-full"
                                />
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>

            {searchOpen ? (
                <button
                    type="button"
                    aria-label="Close search"
                    className="fixed inset-x-0 bottom-0 z-30 animate-in bg-black/20 fade-in-0 duration-300 lg:hidden"
                    style={{top: headerBottom}}
                    onClick={closeSearch}
                />
            ) : null}

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
                            {navItems.length > 0 ? (
                                <nav
                                    aria-label="Blog navigation"
                                    className="flex flex-col gap-12"
                                >
                                    {navItems.map((item) => (
                                        <PrimaryNavLink
                                            key={item.key}
                                            item={item}
                                            onClick={closeMenu}
                                            activeClassName="text-primary"
                                            className="flex items-center justify-between text-xl font-medium text-foreground no-underline"
                                            trailing={
                                                <ArrowRight
                                                    className="size-6 shrink-0"
                                                    strokeWidth={1.75}
                                                    aria-hidden
                                                />
                                            }
                                        />
                                    ))}
                                </nav>
                            ) : (
                                <div />
                            )}

                            <Button asChild>
                                {cta.external ? (
                                    <a
                                        href={cta.href}
                                        {...externalLinkAttributes(cta.href)}
                                    >
                                        {cta.label}
                                    </a>
                                ) : (
                                    <Link href={cta.href}>{cta.label}</Link>
                                )}
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
                <span className="relative block size-4" aria-hidden>
                    <span
                        className={cn(
                            'absolute left-0 h-0.5 w-4 bg-current transition-all duration-300',
                            menuOpen
                                ? 'top-1/2 -translate-y-1/2 rotate-45'
                                : 'top-0.5',
                        )}
                    />
                    <span
                        className={cn(
                            'absolute left-0 top-1/2 h-0.5 w-4 -translate-y-1/2 bg-current transition-opacity duration-300',
                            menuOpen && 'opacity-0',
                        )}
                    />
                    <span
                        className={cn(
                            'absolute left-0 h-0.5 w-4 bg-current transition-all duration-300',
                            menuOpen
                                ? 'top-1/2 -translate-y-1/2 -rotate-45'
                                : 'bottom-0.5',
                        )}
                    />
                </span>
            </Button>
        </div>
    );
}
