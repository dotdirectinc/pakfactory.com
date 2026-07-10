"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import { cn } from "@pakfactory/ui/lib/utils";
import type { NavCategory } from "./site-nav-categories";

type ContextValue = {
  menuOpen: boolean;
  toggleMenu: () => void;
  closeMenu: () => void;
  menuId: string;
  menuTriggerRef: RefObject<HTMLButtonElement | null>;
};

const Ctx = createContext<ContextValue | null>(null);

function useCtx() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("SiteNavCompact components must be inside SiteNavCompactProvider");
  return ctx;
}

type ProviderProps = {
  categories: NavCategory[];
  contactHref: string;
  children: ReactNode;
};

export function SiteNavCompactProvider({ categories, contactHref, children }: ProviderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = "compact-menu";
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    menuTriggerRef.current?.focus();
  }, []);

  const toggleMenu = useCallback(() => setMenuOpen((p) => !p), []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeMenu(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [menuOpen]);

  return (
    <Ctx.Provider value={{ menuOpen, toggleMenu, closeMenu, menuId, menuTriggerRef }}>
      {children}
      {menuOpen && (
        <div
          id={menuId}
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          className="fixed inset-x-0 top-16 bottom-0 z-50 bg-background lg:hidden"
        >
          <div className="mx-auto flex h-full max-w-[var(--layout-max)] flex-col justify-between px-8 py-8">
            {categories.length > 0 ? (
              <nav aria-label="Blog categories" className="flex flex-col gap-12">
                {categories.map(({ href, title }) => (
                  <a
                    key={href}
                    href={href}
                    onClick={closeMenu}
                    className="flex items-center justify-between text-xl font-medium text-foreground no-underline"
                  >
                    {title}
                    <ArrowRight className="size-6 shrink-0" strokeWidth={1.75} aria-hidden />
                  </a>
                ))}
              </nav>
            ) : (
              <div />
            )}
            <Button asChild>
              <a href={contactHref}>Contact Us</a>
            </Button>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function SiteNavTopRow({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-dashed border-border">
      <div className="mx-auto flex h-16 max-w-[var(--layout-max)] items-center justify-between px-8">
        {children}
      </div>
    </div>
  );
}

export function SiteNavCompactActions() {
  const { menuOpen, toggleMenu, menuId, menuTriggerRef } = useCtx();

  return (
    <div className="flex items-center gap-3 lg:hidden">
      <Button
        ref={menuTriggerRef}
        variant="outline"
        size="icon"
        className="size-9 shadow-xs"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        onClick={toggleMenu}
      >
        <span className="relative block size-4" aria-hidden>
          <span className={cn("absolute left-0 h-0.5 w-4 bg-current transition-all duration-300", menuOpen ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0.5")} />
          <span className={cn("absolute left-0 top-1/2 h-0.5 w-4 -translate-y-1/2 bg-current transition-opacity duration-300", menuOpen && "opacity-0")} />
          <span className={cn("absolute left-0 h-0.5 w-4 bg-current transition-all duration-300", menuOpen ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0.5")} />
        </span>
      </Button>
    </div>
  );
}
