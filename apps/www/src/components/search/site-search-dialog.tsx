'use client';

import {useEffect, useState} from 'react';
import {X} from 'lucide-react';
import {
    Dialog,
    DialogOverlay,
    DialogPortal,
    DialogDescription,
    DialogTitle,
} from '@pakfactory/ui/components/dialog';
import {Sheet, SheetContent, SheetDescription, SheetTitle} from '@pakfactory/ui/components/sheet';
import {cn} from '@pakfactory/ui/lib/utils';
import {Dialog as DialogPrimitive} from 'radix-ui';

import {SiteSearchAdvancedBody} from './site-search-advanced';
import {SiteSearchBasicBody} from './site-search-basic';
import {useSiteSearchOpen} from './site-search-provider';

/**
 * The www ⌘K search (PROD-3111): a dark dialog on desktop, a full-screen sheet
 * with Cancel below 768 px. Two modes (PROD-2525, 2026-10-21):
 *
 * - `basic` (default) — one column: recent searches, loose suggestions while
 *   typing, all results on Enter (`site-search-basic.tsx`)
 * - `advanced` — the first, POC-based design with the tab rail and browse
 *   picks (`site-search-advanced.tsx`); paused until its redesign
 */

export type SiteSearchMode = 'basic' | 'advanced';

function useIsMobile(breakpoint = 768) {
    const [mobile, setMobile] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
        const onChange = () => setMobile(mq.matches);
        onChange();
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, [breakpoint]);
    return mobile;
}

/** Mounted once in the site layout; opened by the header icon or ⌘K / Ctrl+K. */
export function SiteSearchDialog({mode = 'basic'}: {mode?: SiteSearchMode}) {
    const {open, setOpen} = useSiteSearchOpen();
    const isMobile = useIsMobile();
    const close = () => setOpen(false);
    const basic = mode === 'basic';

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent
                    side="bottom"
                    showCloseButton={false}
                    className="inset-0 flex h-dvh w-full max-w-none flex-col gap-0 rounded-none border-0 bg-background p-0"
                    data-site-search-dialog=""
                    data-site-search-mode={mode}
                >
                    <SheetTitle className="sr-only">Search</SheetTitle>
                    <SheetDescription className="sr-only">
                        Search products, solutions, customizations, guides and resources.
                    </SheetDescription>
                    {open ? (
                        basic ? (
                            <SiteSearchBasicBody dark={false} showCancel onClose={close} />
                        ) : (
                            <SiteSearchAdvancedBody showRail={false} dark={false} onClose={close} />
                        )
                    ) : null}
                </SheetContent>
            </Sheet>
        );
    }

    // Composed from the shared portal/overlay so the overlay can take the POC's
    // `bg-black/60 backdrop-blur-md` (the shared DialogContent fixes its own).
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogPortal>
                <DialogOverlay className="bg-black/60 backdrop-blur-md" />
                <DialogPrimitive.Content
                    className={cn(
                        'fixed left-1/2 z-50 flex max-w-none -translate-x-1/2 flex-col gap-0 overflow-hidden rounded-[24px] border border-white/10 bg-[#141416] p-0 text-white shadow-2xl outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
                        basic
                            ? // A command palette: anchored near the top, as tall as its content.
                              'top-[12vh] max-h-[min(640px,76vh)] w-[min(720px,94vw)]'
                            : 'top-1/2 h-[min(720px,85vh)] w-[min(960px,94vw)] -translate-y-1/2',
                    )}
                    data-site-search-dialog=""
                    data-site-search-mode={mode}
                >
                    {/*
                      The POC grows its root font at wide screens (17px ≥1600, 18px ≥1920),
                      so its rem-based type and spacing scale up while the dialog box stays
                      960×720. www keeps a fixed 16px root site-wide (packages/ui globals.css),
                      so the same growth is applied to the modal's contents only.
                    */}
                    <div className="relative flex min-h-0 flex-1 flex-col min-[1600px]:[zoom:1.0625] min-[1920px]:[zoom:1.125]">
                        <DialogTitle className="sr-only">Search</DialogTitle>
                        <DialogDescription className="sr-only">
                            Search products, solutions, customizations, guides and resources.
                        </DialogDescription>
                        <button
                            type="button"
                            className="absolute top-3 right-3 z-10 inline-flex size-8 items-center justify-center rounded-[24px] text-white/60 transition-all outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
                            aria-label="Close search"
                            onClick={close}
                        >
                            <X className="size-4" strokeWidth={1.75} />
                        </button>
                        {open ? (
                            basic ? (
                                <SiteSearchBasicBody dark showCancel={false} onClose={close} />
                            ) : (
                                <SiteSearchAdvancedBody showRail dark onClose={close} />
                            )
                        ) : null}
                    </div>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    );
}
