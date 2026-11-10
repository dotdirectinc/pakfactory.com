'use client';

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import {useRouter} from 'next/navigation';
import {Package, X} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@pakfactory/ui/components/sheet';
import {Icon} from '@/components/ui/icon';
import {REQUEST_COPY} from '@/lib/copy/request';
import {useRequest} from '@/lib/request/request-provider';
import type {RequestLine} from '@/lib/request/request.storage';
import {WWW_ROUTES} from '@/lib/www-routes';

type QuotePoolDrawerContextValue = {
    open: boolean;
    openQuotePoolDrawer: () => void;
    closeQuotePoolDrawer: () => void;
};

const QuotePoolDrawerContext = createContext<QuotePoolDrawerContextValue | null>(
    null,
);

export function useQuotePoolDrawer(): QuotePoolDrawerContextValue {
    const ctx = useContext(QuotePoolDrawerContext);
    if (!ctx) {
        throw new Error('useQuotePoolDrawer must be used within QuotePoolDrawerProvider');
    }
    return ctx;
}

function formatQuantities(quantities: number[]): string {
    if (!quantities.length) return '';
    return quantities.map((n) => n.toLocaleString('en-US')).join(', ');
}

function QuotePoolLineRow({
    line,
    onRemove,
}: {
    line: RequestLine;
    onRemove: (id: string) => void;
}) {
    const thumb = line.productMedia?.[0];
    const title = line.productTitle?.trim() || line.productSlug;
    const qty = formatQuantities(line.quantities);

    return (
        <li className="flex gap-3 border-b border-border py-4 last:border-b-0">
            <div className="size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                {thumb?.src ? (
                    <img
                        src={thumb.src}
                        alt={thumb.alt ?? title}
                        className="size-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <span className="flex size-full items-center justify-center">
                        <Icon
                            icon={Package}
                            className="size-6 text-muted-foreground/50"
                        />
                    </span>
                )}
            </div>
            <div className="min-w-0 flex-1">
                {line.productSku ? (
                    <p className="truncate text-xs uppercase tracking-wide text-muted-foreground">
                        {line.productSku}
                    </p>
                ) : null}
                <p className="truncate text-sm font-medium text-foreground">{title}</p>
                {qty ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                        Qty: {qty}
                    </p>
                ) : null}
                {line.contents.trim() ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {line.contents}
                    </p>
                ) : null}
            </div>
            <button
                type="button"
                onClick={() => onRemove(line.id)}
                aria-label={REQUEST_COPY.quotePoolRemoveAria.replace('{title}', title)}
                className="-m-1 shrink-0 self-start rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
                <X className="size-4" aria-hidden />
            </button>
        </li>
    );
}

function QuotePoolDrawerSheet({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const router = useRouter();
    const {lines, removeLine} = useRequest();
    const count = lines.length;

    function createRequest() {
        onOpenChange(false);
        router.push(WWW_ROUTES.requestProducts);
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="z-[100] flex w-full flex-col gap-0 p-0 sm:max-w-md"
            >
                <SheetHeader className="shrink-0 border-b border-border px-5 py-4 pr-12 text-left">
                    <SheetTitle className="text-lg font-semibold tracking-tight">
                        {REQUEST_COPY.quotePoolTitle}
                    </SheetTitle>
                    <SheetDescription>
                        {count === 1
                            ? REQUEST_COPY.quotePoolCountOne
                            : REQUEST_COPY.quotePoolCountMany.replace(
                                  '{n}',
                                  String(count),
                              )}
                    </SheetDescription>
                </SheetHeader>

                <div className="min-h-0 flex-1 overflow-y-auto px-5">
                    {count === 0 ? (
                        <p className="py-8 text-sm text-muted-foreground">
                            {REQUEST_COPY.quotePoolEmpty}
                        </p>
                    ) : (
                        <ul className="list-none p-0">
                            {lines.map((line) => (
                                <QuotePoolLineRow
                                    key={line.id}
                                    line={line}
                                    onRemove={removeLine}
                                />
                            ))}
                        </ul>
                    )}
                </div>

                <div className="shrink-0 space-y-2 border-t border-border px-5 py-4">
                    <Button
                        type="button"
                        className="h-auto w-full px-6 py-3 text-base"
                        disabled={count === 0}
                        onClick={createRequest}
                    >
                        {REQUEST_COPY.quotePoolCreate}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-auto w-full px-6 py-3 text-base shadow-none"
                        onClick={() => onOpenChange(false)}
                    >
                        {REQUEST_COPY.quotePoolContinue}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

/** Site-wide quote pool confirmation drawer after Add to quote. */
export function QuotePoolDrawerProvider({children}: {children: ReactNode}) {
    const [open, setOpen] = useState(false);
    const openQuotePoolDrawer = useCallback(() => setOpen(true), []);
    const closeQuotePoolDrawer = useCallback(() => setOpen(false), []);
    const value = useMemo(
        () => ({open, openQuotePoolDrawer, closeQuotePoolDrawer}),
        [open, openQuotePoolDrawer, closeQuotePoolDrawer],
    );

    return (
        <QuotePoolDrawerContext.Provider value={value}>
            {children}
            <QuotePoolDrawerSheet open={open} onOpenChange={setOpen} />
        </QuotePoolDrawerContext.Provider>
    );
}
