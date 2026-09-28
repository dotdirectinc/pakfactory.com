'use client';

import {
    useEffect,
    useMemo,
    useRef,
    useState,
    forwardRef,
    type Ref,
} from 'react';
import {createPortal} from 'react-dom';
import {Check, ChevronDown, Plus, X} from 'lucide-react';
import {
    PageDielineSection,
} from '@pakfactory/ui/components/page-dieline-section';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
} from '@pakfactory/ui/components/drawer';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@pakfactory/ui/components/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@pakfactory/ui/components/select';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';
import {CompareSpecMatrix} from '@/components/ui/compare-spec-matrix';
import {Icon} from '@/components/ui/icon';
import {SanityImage} from '@/components/ui/sanity-image';
import {SectionHeading} from '@/components/ui/section-heading';
import {buildCompareMatrix, CUSTOMIZATION_COMPARISON_ID} from '@/lib/catalog/compare-matrix';
import type {CustomizationDetail} from '@/lib/catalog/types';

export {CUSTOMIZATION_COMPARISON_ID};

const SLOT_COUNT = 3;
/** Matches Tailwind `md` — desktop dropdown; below = mobile drawer. */
const MD_UP_QUERY = '(min-width: 768px)';
/** 40px from viewport top; below header chrome where they overlap (z-40 under header z-50). */
const FLOAT_DOCK_TOP = 'top-10';
const FLOAT_DOCK_Z = 'z-40';
/** 8pt spacer matching float dock content (thumb + select). */
const FLOAT_DOCK_SPACER_CLASS = 'h-20';

function useIsMdUp() {
    const [isMdUp, setIsMdUp] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia(MD_UP_QUERY);
        const sync = () => setIsMdUp(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    return isMdUp;
}

type CustomizationComparisonProps = {
    detail: CustomizationDetail;
    peers: CustomizationDetail[];
    className?: string;
};

function seedSlots(
    current: CustomizationDetail,
    peers: CustomizationDetail[],
): Array<CustomizationDetail | null> {
    return [
        current,
        peers[0] ?? null,
        peers[1] ?? null,
    ];
}

/**
 * How it stacks up — interactive same-category compare band (PROD-1534).
 * Column state is local only; does not write the catalog compare tray.
 */
export function CustomizationComparison({
    detail,
    peers,
    className,
}: CustomizationComparisonProps) {
    const sectionRef = useRef<HTMLElement | null>(null);
    const heroRef = useRef<HTMLDivElement | null>(null);
    const [heroPastViewport, setHeroPastViewport] = useState(false);
    const [sectionInView, setSectionInView] = useState(true);
    const [slots, setSlots] = useState(() => seedSlots(detail, peers));

    const peerKey = peers.map((p) => p.id).join(',');

    useEffect(() => {
        setSlots(seedSlots(detail, peers));
        // Re-seed when the detail page option or peer set changes (route navigation).
        // eslint-disable-next-line react-hooks/exhaustive-deps -- peerKey captures peer identity
    }, [detail.id, peerKey]);

    const filledItems = useMemo(
        () => slots.filter((s): s is CustomizationDetail => s != null),
        [slots],
    );

    const slotIds = useMemo(
        () => filledItems.map((c) => c.id),
        [filledItems],
    );

    const categoryCandidates = useMemo(() => {
        const byId = new Map<string, CustomizationDetail>();
        byId.set(detail.id, detail);
        for (const peer of peers) {
            byId.set(peer.id, peer);
        }
        return [...byId.values()].sort((a, b) =>
            a.title.localeCompare(b.title),
        );
    }, [detail, peers]);

    const addCandidates = useMemo(
        () => categoryCandidates.filter((c) => !slotIds.includes(c.id)),
        [categoryCandidates, slotIds],
    );

    useEffect(() => {
        const heroEl = heroRef.current;
        const sectionEl = sectionRef.current;
        if (!heroEl || !sectionEl) return undefined;

        const heroIo = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry) return;
                setHeroPastViewport(
                    !entry.isIntersecting &&
                        entry.boundingClientRect.bottom <= 0,
                );
            },
            {root: null, rootMargin: '0px', threshold: 0},
        );
        heroIo.observe(heroEl);

        const sectionIo = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry) return;
                setSectionInView(entry.isIntersecting);
            },
            {root: null, rootMargin: '0px', threshold: 0},
        );
        sectionIo.observe(sectionEl);

        return () => {
            heroIo.disconnect();
            sectionIo.disconnect();
        };
    }, [detail.id]);

    function addOption(next: CustomizationDetail) {
        setSlots((prev) => {
            if (prev.some((c) => c?.id === next.id)) return prev;
            const emptyIndex = prev.findIndex((c, i) => i > 0 && !c);
            if (emptyIndex < 0) return prev;
            const copy = [...prev];
            copy[emptyIndex] = next;
            return copy;
        });
    }

    function replaceOtherSlot(slotIndex: number, next: CustomizationDetail) {
        if (slotIndex < 1) return;
        setSlots((prev) => {
            if (prev.some((c, i) => i !== slotIndex && c?.id === next.id)) {
                return prev;
            }
            if (slotIndex < prev.length && prev[slotIndex]) {
                const copy = [...prev];
                copy[slotIndex] = next;
                return copy;
            }
            const emptyIndex = prev.findIndex((c, i) => i > 0 && !c);
            if (emptyIndex < 0) return prev;
            const copy = [...prev];
            copy[emptyIndex] = next;
            return copy;
        });
    }

    const matrix = useMemo(() => buildCompareMatrix(slots), [slots]);
    const matrixColumns = useMemo(
        () =>
            Array.from(
                {length: SLOT_COUNT},
                (_, i) =>
                    slots[i]
                        ? {id: slots[i]!.id, title: slots[i]!.title}
                        : null,
            ),
        [slots],
    );

    const showFloatDock = heroPastViewport && sectionInView;

    return (
        <section
            ref={sectionRef}
            id={CUSTOMIZATION_COMPARISON_ID}
            className={cn('scroll-mt-32', className)}
        >
            <PageDielineSection innerClassName="border-b border-dashed border-border py-16 sm:py-20">
                <SectionHeading
                    eyebrow="Comparison"
                    title="How it stacks up"
                    description="Side-by-side specs for up to three options in the same category. Swap columns or add another to refine the shortlist."
                    descriptionClassName="text-base leading-6"
                />

                <div className="mt-12 flex flex-col gap-0">
                    <DetailCompareHero
                        ref={heroRef}
                        slots={slots}
                        addCandidates={addCandidates}
                        swapCandidates={categoryCandidates}
                        onReplaceSlot={replaceOtherSlot}
                        onAdd={addOption}
                    />

                    {showFloatDock ? (
                        <>
                            <div
                                className={FLOAT_DOCK_SPACER_CLASS}
                                aria-hidden
                            />
                            <CompareFloatDock
                                slots={slots}
                                addCandidates={addCandidates}
                                swapCandidates={categoryCandidates}
                                onReplaceSlot={replaceOtherSlot}
                                onAdd={addOption}
                                currentLabel={detail.title}
                            />
                        </>
                    ) : null}

                    {matrix.rows.length > 0 ? (
                        <CompareSpecMatrix
                            columns={matrixColumns}
                            rows={matrix.rows}
                        />
                    ) : (
                        <p className="mt-8 text-sm text-muted-foreground">
                            Stated specs for this category will appear here
                            once they are authored on the options.
                        </p>
                    )}
                </div>
            </PageDielineSection>
        </section>
    );
}

const DetailCompareHero = forwardRef(function DetailCompareHero(
    {
        slots,
        addCandidates,
        swapCandidates,
        onReplaceSlot,
        onAdd,
    }: {
        slots: Array<CustomizationDetail | null>;
        addCandidates: CustomizationDetail[];
        swapCandidates: CustomizationDetail[];
        onReplaceSlot: (slotIndex: number, next: CustomizationDetail) => void;
        onAdd: (next: CustomizationDetail) => void;
    },
    ref: Ref<HTMLDivElement>,
) {
    return (
        <div
            ref={ref}
            className="overflow-hidden rounded-xl bg-muted"
        >
            <div className="grid grid-cols-2 gap-0 md:grid-cols-3">
                {slots.map((cap, slotIndex) => (
                    <DetailHeroColumn
                        key={cap ? `${cap.id}-${slotIndex}` : `empty-${slotIndex}`}
                        cap={cap}
                        slotIndex={slotIndex}
                        slots={slots}
                        locked={slotIndex === 0}
                        addCandidates={addCandidates}
                        swapCandidates={swapCandidates}
                        onReplaceSlot={onReplaceSlot}
                        onAdd={onAdd}
                    />
                ))}
            </div>
        </div>
    );
});

function DetailHeroColumn({
    cap,
    slotIndex,
    slots,
    locked,
    addCandidates,
    swapCandidates,
    onReplaceSlot,
    onAdd,
}: {
    cap: CustomizationDetail | null;
    slotIndex: number;
    slots: Array<CustomizationDetail | null>;
    locked: boolean;
    addCandidates: CustomizationDetail[];
    swapCandidates: CustomizationDetail[];
    onReplaceSlot: (slotIndex: number, next: CustomizationDetail) => void;
    onAdd: (next: CustomizationDetail) => void;
}) {
    const columnClass = cn(
        'flex min-w-0 flex-col gap-4 border-border pb-4 pt-0',
        slotIndex === 2 && 'hidden md:block',
        slotIndex === 0 && 'border-r border-dashed',
        slotIndex === 1 && 'md:border-r md:border-dashed',
    );

    if (!cap) {
        return (
            <div className={columnClass}>
                <EmptySlotPlaceholder
                    addCandidates={addCandidates}
                    onAdd={onAdd}
                    surface="hero"
                />
            </div>
        );
    }

    const hero = cap.media.find((m) => Boolean(m.src));

    return (
        <div className={columnClass}>
            <div className="relative flex h-57 w-full shrink-0 flex-col items-stretch justify-center overflow-hidden bg-muted">
                {hero?.src ? (
                    <SanityImage
                        src={hero.src}
                        alt={hero.alt || cap.title}
                        fill
                        sizes="(min-width: 768px) 33vw, 50vw"
                        className="object-cover"
                    />
                ) : null}
                <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-muted/40 to-transparent" />
                <div className="relative z-10 flex h-full min-h-0 flex-col justify-end gap-4 p-4">
                    <div className="pointer-events-auto w-full min-w-0">
                        {!locked ? (
                            <ColumnSwapSelect
                                cap={cap}
                                slotIndex={slotIndex}
                                slots={slots}
                                swapCandidates={swapCandidates}
                                onReplaceSlot={onReplaceSlot}
                                surface="overlay"
                            />
                        ) : (
                            <div className="flex h-8 w-full min-w-0 items-center rounded-control border border-border bg-background/80 px-2 text-xs font-medium text-foreground shadow-none backdrop-blur-sm">
                                <span className="min-w-0 truncate">
                                    {cap.title}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex min-w-0 flex-col gap-1 px-4 pb-4 pt-0">
                <p className="text-base font-semibold leading-snug tracking-tight text-foreground">
                    {cap.title}
                </p>
                {cap.description ? (
                    <p className="text-sm leading-snug text-muted-foreground">
                        {cap.description}
                    </p>
                ) : null}
            </div>
        </div>
    );
}

function CompareFloatDock({
    slots,
    addCandidates,
    swapCandidates,
    onReplaceSlot,
    onAdd,
    currentLabel,
}: {
    slots: Array<CustomizationDetail | null>;
    addCandidates: CustomizationDetail[];
    swapCandidates: CustomizationDetail[];
    onReplaceSlot: (slotIndex: number, next: CustomizationDetail) => void;
    onAdd: (next: CustomizationDetail) => void;
    currentLabel: string;
}) {
    const dock = (
        <div
            className={cn(
                'pointer-events-none fixed inset-x-0 flex justify-center px-layout-gutter-outer',
                FLOAT_DOCK_TOP,
                FLOAT_DOCK_Z,
            )}
            role="region"
            aria-label="Compare options"
        >
            <div className="w-full max-w-[var(--layout-max)] px-layout-gutter-inner">
                <div
                    className={cn(
                        'pointer-events-auto w-full rounded-xl bg-muted py-4 shadow-sm',
                    )}
                >
                    <div className="grid grid-cols-2 gap-0 md:grid-cols-3">
                        {slots.map((cap, slotIndex) => (
                            <div
                                key={
                                    cap
                                        ? `dock-${cap.id}`
                                        : `dock-empty-${slotIndex}`
                                }
                                className={cn(
                                    'flex min-w-0 flex-col gap-2 px-5',
                                    slotIndex === 2 && 'hidden md:flex',
                                    slotIndex === 0 &&
                                        'border-r border-dashed border-border',
                                    slotIndex === 1 &&
                                        'border-border md:border-r md:border-dashed',
                                )}
                            >
                                {cap ? (
                                    <div className="flex min-w-0 gap-4">
                                        <CompareFloatDockThumb cap={cap} />
                                        {slotIndex === 0 ? (
                                            <div className="flex min-w-0 flex-1 flex-col gap-0">
                                                <p className="text-xs font-medium tracking-wide text-muted-foreground">
                                                    Current
                                                </p>
                                                <div className="flex h-8 min-w-0 items-center">
                                                    <p className="truncate text-base font-semibold leading-none tracking-tight text-foreground">
                                                        {currentLabel}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex min-w-0 flex-1 flex-col gap-0">
                                            <p className="text-xs font-medium tracking-wide text-muted-foreground">
                                                Compare
                                            </p>
                                                <ColumnSwapSelect
                                                    cap={cap}
                                                    slotIndex={slotIndex}
                                                    slots={slots}
                                                    swapCandidates={
                                                        swapCandidates
                                                    }
                                                    onReplaceSlot={
                                                        onReplaceSlot
                                                    }
                                                    surface="dock"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <EmptySlotPlaceholder
                                        addCandidates={addCandidates}
                                        onAdd={onAdd}
                                        surface="sticky"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return null;
    return createPortal(dock, document.body);
}

function firstMediaSrc(cap: CustomizationDetail) {
    return cap.media.find((m) => Boolean(m.src)) ?? null;
}

function CompareFloatDockThumb({cap}: {cap: CustomizationDetail}) {
    const thumb = firstMediaSrc(cap);
    return (
        <div className="relative size-12 shrink-0 self-start overflow-hidden rounded-control bg-foreground/10">
            {thumb?.src ? (
                <SanityImage
                    src={thumb.src}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                />
            ) : null}
        </div>
    );
}

function CompareMenuThumb({cap}: {cap: CustomizationDetail}) {
    const thumb = firstMediaSrc(cap);
    return (
        <div className="relative size-8 shrink-0 overflow-hidden rounded-control bg-foreground/10">
            {thumb?.src ? (
                <SanityImage
                    src={thumb.src}
                    alt=""
                    fill
                    sizes="32px"
                    className="object-cover"
                />
            ) : null}
        </div>
    );
}

function CompareOptionList({
    options,
    selectedId,
    onSelect,
    showThumbs = true,
}: {
    options: CustomizationDetail[];
    selectedId?: string | null;
    onSelect: (next: CustomizationDetail) => void;
    showThumbs?: boolean;
}) {
    return (
        <ul className="flex flex-col gap-0 py-2" role="listbox">
            {options.map((c) => {
                const selected = c.id === selectedId;
                return (
                    <li key={c.id} role="none">
                        <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className={cn(
                                'flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-foreground',
                                'hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
                                selected && 'bg-muted/60',
                            )}
                            onClick={() => onSelect(c)}
                        >
                            {showThumbs ? <CompareMenuThumb cap={c} /> : null}
                            <span className="min-w-0 flex-1 line-clamp-2 font-medium">
                                {c.title}
                            </span>
                            {selected ? (
                                <Icon
                                    icon={Check}
                                    size="sm"
                                    className="shrink-0 text-foreground"
                                />
                            ) : (
                                <span className="size-4 shrink-0" aria-hidden />
                            )}
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

function ComparePickerDrawer({
    open,
    onOpenChange,
    title,
    options,
    selectedId,
    onSelect,
    showThumbs = true,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    options: CustomizationDetail[];
    selectedId?: string | null;
    onSelect: (next: CustomizationDetail) => void;
    showThumbs?: boolean;
}) {
    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="max-h-[90dvh]">
                <DrawerHeader className="relative border-b border-border text-left">
                    <DrawerTitle className="pr-10 text-center text-lg">
                        {title}
                    </DrawerTitle>
                    <DrawerClose asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-3 top-3 size-9"
                            aria-label="Close"
                        >
                            <X className="size-5" />
                        </Button>
                    </DrawerClose>
                </DrawerHeader>
                <div className="min-h-0 flex-1 overflow-y-auto pb-6">
                    <CompareOptionList
                        options={options}
                        selectedId={selectedId}
                        showThumbs={showThumbs}
                        onSelect={(next) => {
                            onSelect(next);
                            onOpenChange(false);
                        }}
                    />
                </div>
            </DrawerContent>
        </Drawer>
    );
}

function ColumnSwapSelect({
    cap,
    slotIndex,
    slots,
    swapCandidates,
    onReplaceSlot,
    surface,
}: {
    cap: CustomizationDetail;
    slotIndex: number;
    slots: Array<CustomizationDetail | null>;
    swapCandidates: CustomizationDetail[];
    onReplaceSlot: (slotIndex: number, next: CustomizationDetail) => void;
    surface: 'overlay' | 'muted' | 'dock';
}) {
    const isMdUp = useIsMdUp();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const otherSelectedIds = useMemo(() => {
        const set = new Set<string>();
        slots.forEach((c, i) => {
            if (i !== slotIndex && c) set.add(c.id);
        });
        return set;
    }, [slots, slotIndex]);

    const selectOptions = useMemo(
        () =>
            swapCandidates.filter(
                (c) => c.id === cap.id || !otherSelectedIds.has(c.id),
            ),
        [swapCandidates, cap.id, otherSelectedIds],
    );

    const dockTitleClass =
        'truncate text-base font-semibold leading-none tracking-tight text-foreground';

    const pick = (next: CustomizationDetail) => {
        onReplaceSlot(slotIndex, next);
    };

    if (surface === 'dock') {
        if (selectOptions.length <= 1) {
            return (
                <div className="flex h-8 min-w-0 items-center">
                    <p className={dockTitleClass}>{cap.title}</p>
                </div>
            );
        }

        if (!isMdUp) {
            return (
                <>
                    <button
                        type="button"
                        className={cn(
                            'flex h-8 w-full min-w-0 items-center justify-start gap-1',
                            'border-0 bg-transparent px-0 shadow-none outline-none',
                            'focus-visible:ring-0',
                            dockTitleClass,
                        )}
                        aria-label={`Switch option in column ${slotIndex + 1}`}
                        onClick={() => setDrawerOpen(true)}
                    >
                        <span className="min-w-0 truncate">{cap.title}</span>
                        <Icon
                            icon={ChevronDown}
                            size="sm"
                            className="shrink-0 opacity-50"
                        />
                    </button>
                    <ComparePickerDrawer
                        open={drawerOpen}
                        onOpenChange={setDrawerOpen}
                        title="Compare"
                        options={selectOptions}
                        selectedId={cap.id}
                        onSelect={pick}
                    />
                </>
            );
        }

        return (
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            'flex h-8 w-full min-w-0 items-center justify-start gap-1',
                            'border-0 bg-transparent px-0 shadow-none outline-none',
                            'focus-visible:ring-0',
                            dockTitleClass,
                        )}
                        aria-label={`Switch option in column ${slotIndex + 1}`}
                    >
                        <span className="min-w-0 truncate">{cap.title}</span>
                        <Icon
                            icon={ChevronDown}
                            size="sm"
                            className="shrink-0 opacity-50"
                        />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    className="max-h-72 min-w-64 overflow-y-auto"
                >
                    <DropdownMenuRadioGroup
                        value={cap.id}
                        onValueChange={(id) => {
                            const next = selectOptions.find((c) => c.id === id);
                            if (next) pick(next);
                        }}
                    >
                        {selectOptions.map((c) => (
                            <DropdownMenuRadioItem key={c.id} value={c.id}>
                                <span className="flex min-w-0 items-center gap-2">
                                    <CompareMenuThumb cap={c} />
                                    <span className="line-clamp-2">{c.title}</span>
                                </span>
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    const triggerClass =
        surface === 'overlay'
            ? 'h-8 w-full min-w-0 rounded-control border-border bg-background/80 px-2 text-xs font-medium text-foreground shadow-none backdrop-blur-sm hover:bg-background/90'
            : 'h-8 w-full min-w-0';

    if (selectOptions.length <= 1) {
        return (
            <div
                className={cn(
                    'flex h-8 w-full min-w-0 items-center rounded-control border border-border px-2 text-xs font-medium',
                    surface === 'overlay'
                        ? 'bg-background/80 text-foreground backdrop-blur-sm'
                        : 'bg-muted/60 text-foreground',
                )}
                aria-hidden
            >
                <span className="min-w-0 truncate">{cap.title}</span>
            </div>
        );
    }

    if (!isMdUp) {
        return (
            <>
                <button
                    type="button"
                    className={cn(
                        'flex w-full items-center justify-between gap-2',
                        triggerClass,
                        'border border-border',
                    )}
                    aria-label={`Switch option in column ${slotIndex + 1}`}
                    onClick={() => setDrawerOpen(true)}
                >
                    <span className="min-w-0 truncate">{cap.title}</span>
                    <Icon
                        icon={ChevronDown}
                        size="sm"
                        className="shrink-0 opacity-50"
                    />
                </button>
                <ComparePickerDrawer
                    open={drawerOpen}
                    onOpenChange={setDrawerOpen}
                    title="Compare"
                    options={selectOptions}
                    selectedId={cap.id}
                    onSelect={pick}
                />
            </>
        );
    }

    return (
        <Select
            value={cap.id}
            onValueChange={(id) => {
                const next = selectOptions.find((c) => c.id === id);
                if (next) pick(next);
            }}
        >
            <SelectTrigger
                size="sm"
                className={triggerClass}
                aria-label={`Switch option in column ${slotIndex + 1}`}
            >
                <SelectValue placeholder={cap.title}>{cap.title}</SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-72" position="item-aligned">
                {selectOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id} textValue={c.title}>
                        <span className="line-clamp-2">{c.title}</span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function EmptySlotPlaceholder({
    addCandidates,
    onAdd,
    surface,
}: {
    addCandidates: CustomizationDetail[];
    onAdd: (next: CustomizationDetail) => void;
    surface: 'hero' | 'sticky';
}) {
    const isHero = surface === 'hero';
    const isMdUp = useIsMdUp();
    const [drawerOpen, setDrawerOpen] = useState(false);

    return (
        <div
            className={cn(
                'flex flex-col',
                isHero
                    ? 'h-57 justify-end gap-2 bg-muted/40 px-4 pb-4 pt-4'
                    : 'min-h-16 justify-center gap-2 rounded-control bg-muted/40 px-4 py-4',
            )}
        >
            {addCandidates.length > 0 ? (
                isMdUp ? (
                    <Select
                        key={addCandidates.map((c) => c.id).join(',')}
                        onValueChange={(id) => {
                            const next = addCandidates.find((c) => c.id === id);
                            if (next) onAdd(next);
                        }}
                    >
                        <SelectTrigger
                            className={cn(
                                'w-full',
                                isHero ? 'h-10' : 'h-8 text-xs',
                            )}
                        >
                            <SelectValue placeholder="Choose to compare" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                            {addCandidates.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                    {c.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <>
                        <button
                            type="button"
                            className={cn(
                                'flex w-full items-center justify-between gap-2 rounded-control border border-input bg-transparent px-3 text-sm text-muted-foreground shadow-xs',
                                isHero ? 'h-10' : 'h-8 text-xs',
                            )}
                            onClick={() => setDrawerOpen(true)}
                        >
                            <span>Choose to compare</span>
                            <Icon
                                icon={ChevronDown}
                                size="sm"
                                className="shrink-0 opacity-50"
                            />
                        </button>
                        <ComparePickerDrawer
                            open={drawerOpen}
                            onOpenChange={setDrawerOpen}
                            title="Choose to compare"
                            options={addCandidates}
                            onSelect={onAdd}
                        />
                    </>
                )
            ) : (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Icon icon={Plus} size="sm" />
                    No more options in this category
                </p>
            )}
        </div>
    );
}
