// Source: shadcn-studio (product-overview-02)
'use client';

import {useEffect, useRef, useState} from 'react';

import {
    BadgePercentIcon,
    ChevronDownIcon,
    MapPinIcon,
    MinusIcon,
    PlusIcon,
    StarIcon,
    StoreIcon,
    TruckIcon,
} from 'lucide-react';

import {
    Button as AriaButton,
    Group,
    Input as AriaInput,
    NumberField,
} from 'react-aria-components';

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@pakfactory/ui/components/breadcrumb';
import {Button} from '@pakfactory/ui/components/button';
import {Card, CardContent} from '@pakfactory/ui/components/card';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    type CarouselApi,
} from '@pakfactory/ui/components/carousel';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@pakfactory/ui/components/collapsible';
import {Rating} from '@pakfactory/ui/components/rating';
import {Separator} from '@pakfactory/ui/components/separator';

// ─── Types ───────────────────────────────────────────────────────────────────

type CapabilityOption = {
    value: string;
    label: string;
    image?: string;
};

type CapabilityCategory = {
    id: string;
    title: string;
    options: CapabilityOption[];
};

type ProductOverviewProps = {
    productItems: {
        name: string;
        brand: string;
        itemSold: number;
        description: string;
        totalReview: number;
        storeLink: string;
        rating: number;
        price: number;
        hasDiscount?: boolean;
        discountPercentage?: number;
        address?: string;
        shippingCharges?: number;
        images: Array<{src: string; alt: string}>;
        breadcrumbData: Array<{label: string; href?: string}>;
    }[];
    capabilityCategories?: CapabilityCategory[];
};

// ─── Capability dropdown ──────────────────────────────────────────────────────

function CapabilitySelect({
    category,
    value,
    onChange,
}: {
    category: CapabilityCategory;
    value: string;
    onChange: (val: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = category.options.find((o) => o.value === value);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {category.title}
            </span>
            <div ref={ref} className="relative">
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    className="border-input bg-background hover:bg-accent flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-sm shadow-xs transition-colors"
                >
                    {selected?.image && (
                        <img
                            src={selected.image}
                            alt={selected.label}
                            className="size-7 rounded object-cover"
                        />
                    )}
                    <span className="grow text-left">
                        {selected ? selected.label : 'Select…'}
                    </span>
                    <ChevronDownIcon
                        className={`text-muted-foreground size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                </button>

                {open && (
                    <div className="bg-background border-input absolute z-20 mt-1 w-full overflow-hidden rounded-lg border shadow-md">
                        {category.options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(opt.value);
                                    setOpen(false);
                                }}
                                className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                                    value === opt.value
                                        ? 'bg-primary/10 text-primary font-medium'
                                        : 'hover:bg-accent'
                                }`}
                            >
                                {opt.image && (
                                    <img
                                        src={opt.image}
                                        alt={opt.label}
                                        className="size-7 rounded object-cover"
                                    />
                                )}
                                <span>{opt.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

const ProductOverview = ({
    productItems,
    capabilityCategories = [],
}: ProductOverviewProps) => {
    const [selectedImage, setSelectedImage] = useState(0);
    const [api, setApi] = useState<CarouselApi>();
    const [quantityRows, setQuantityRows] = useState<number[]>([1]);
    const [selections, setSelections] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!api) return;
        api.scrollTo(selectedImage);
    }, [api, selectedImage]);

    useEffect(() => {
        if (!api) return;
        const onSelect = () => setSelectedImage(api.selectedScrollSnap());
        api.on('select', onSelect);
        onSelect();
        return () => {
            api.off('select', onSelect);
        };
    }, [api]);

    const selectedOptions = capabilityCategories
        .filter((cat) => selections[cat.id])
        .map((cat) => ({
            categoryTitle: cat.title,
            option: cat.options.find((o) => o.value === selections[cat.id])!,
        }));

    return (
        <section className="bg-muted py-8 sm:py-16 lg:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {productItems.map((item) => (
                    <div key={item.name}>
                        <Breadcrumb className="mb-12 md:mb-16 lg:mb-24">
                            <BreadcrumbList>
                                {item.breadcrumbData.map((breadcrumb, index) => (
                                    <div
                                        key={`${breadcrumb.label}-${index}`}
                                        className="flex items-center gap-2.5"
                                    >
                                        <BreadcrumbItem>
                                            {index ===
                                            item.breadcrumbData.length - 1 ? (
                                                <BreadcrumbPage>
                                                    {breadcrumb.label}
                                                </BreadcrumbPage>
                                            ) : (
                                                <BreadcrumbLink
                                                    href={breadcrumb.href || '#'}
                                                >
                                                    {breadcrumb.label}
                                                </BreadcrumbLink>
                                            )}
                                        </BreadcrumbItem>
                                        {index <
                                            item.breadcrumbData.length - 1 && (
                                            <BreadcrumbSeparator
                                                key={`${breadcrumb.label}-sep`}
                                            />
                                        )}
                                    </div>
                                ))}
                            </BreadcrumbList>
                        </Breadcrumb>

                        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {/* ── Left: Image Carousel ── */}
                            <div className="flex flex-col gap-8">
                                <Carousel
                                    className="w-full"
                                    setApi={setApi}
                                    opts={{align: 'start', loop: true}}
                                >
                                    <CarouselContent>
                                        {item.images.map((image, index) => (
                                            <CarouselItem
                                                key={`${image.alt}-${index}`}
                                            >
                                                <div className="h-99 overflow-hidden rounded-lg bg-gray-100">
                                                    <img
                                                        src={image.src}
                                                        alt={image.alt}
                                                        className="h-full w-full object-cover"
                                                    />
                                                </div>
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                </Carousel>

                                <div className="grid grid-cols-4 gap-2">
                                    {item.images.map((image, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() =>
                                                setSelectedImage(index)
                                            }
                                            className={`aspect-square w-full cursor-pointer overflow-hidden rounded-sm border-2 transition-all duration-200 ${selectedImage === index ? 'border-primary' : 'border-transparent'}`}
                                        >
                                            <img
                                                src={image.src}
                                                alt={image.alt}
                                                className="h-full w-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-1 rounded-md border px-4">
                                    <div className="flex items-center gap-2 py-4">
                                        <StoreIcon className="size-5.5" />
                                        <p className="text-muted-foreground flex grow items-center gap-1 font-medium">
                                            Stylish
                                            <BadgePercentIcon className="text-foreground size-4" />
                                        </p>
                                        <StarIcon className="mb-0.5 size-4 fill-amber-500 stroke-transparent" />
                                        <p className="text-muted-foreground font-semibold">
                                            ({item.rating})
                                        </p>
                                        <p className="text-green-500">
                                            {item.totalReview} Reviews
                                        </p>
                                    </div>
                                    <Separator />
                                    <div className="flex items-center gap-2 py-4">
                                        <MapPinIcon className="text-foreground size-5.5" />
                                        <p className="text-muted-foreground grow font-medium">
                                            {item.address}
                                        </p>
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                        >
                                            <a href={item.storeLink}>
                                                Visit Store
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* ── Middle: Product Details ── */}
                            <div className="space-y-7">
                                <div className="space-y-3">
                                    <p className="text-muted-foreground font-medium uppercase">
                                        {item.brand}
                                    </p>
                                    <h1 className="text-2xl font-semibold">
                                        {item.name}
                                    </h1>
                                    <div className="flex items-center gap-3">
                                        <Rating
                                            readOnly
                                            variant="yellow"
                                            size={16}
                                            value={item.rating}
                                            precision={0.5}
                                        />
                                        <span className="text-muted-foreground font-medium">
                                            ({item.rating})
                                        </span>
                                        <span className="text-green-500">
                                            {item.totalReview} Reviews
                                        </span>
                                        <span className="text-muted-foreground">
                                            {item.itemSold} sold
                                        </span>
                                    </div>
                                </div>

                                {item.description && (
                                    <div className="flex flex-col gap-3">
                                        <h4 className="font-semibold">
                                            Description
                                        </h4>
                                        <p className="text-muted-foreground font-normal">
                                            {item.description}{' '}
                                            <a
                                                href="#"
                                                className="text-foreground"
                                            >
                                                Read more
                                            </a>
                                        </p>
                                    </div>
                                )}

                                {capabilityCategories.length > 0 && (
                                    <div className="flex flex-col gap-4">
                                        <h4 className="font-semibold">
                                            Capabilities
                                        </h4>
                                        {capabilityCategories.map((cat) => (
                                            <CapabilitySelect
                                                key={cat.id}
                                                category={cat}
                                                value={selections[cat.id] ?? ''}
                                                onChange={(val) =>
                                                    setSelections((s) => ({
                                                        ...s,
                                                        [cat.id]: val,
                                                    }))
                                                }
                                            />
                                        ))}
                                    </div>
                                )}

                                <div className="flex flex-col gap-3">
                                    <h4 className="font-semibold">Details</h4>
                                    <div className="flex items-center gap-3">
                                        <MapPinIcon className="text-muted-foreground size-5" />
                                        <p className="text-muted-foreground grow font-medium">
                                            Sent from{' '}
                                            <span className="font-semibold">
                                                {item.address}
                                            </span>
                                        </p>
                                    </div>
                                    <Collapsible>
                                        <div className="flex items-center gap-3">
                                            <TruckIcon className="text-muted-foreground size-5 shrink-0" />
                                            <p className="text-muted-foreground font-medium">
                                                Shipping{' '}
                                                <span className="font-semibold">
                                                    ${item.shippingCharges}
                                                </span>
                                            </p>
                                            <CollapsibleTrigger className="flex items-center justify-between gap-1 text-sm">
                                                Shipping Details
                                                <ChevronDownIcon className="size-4 transition-transform in-data-[state=open]:rotate-180" />
                                            </CollapsibleTrigger>
                                        </div>
                                        <CollapsibleContent>
                                            <p className="text-muted-foreground">
                                                To track your order, simply log
                                                in to your account and navigate
                                                to the order history section.
                                                You&apos;ll find detailed
                                                information about your order
                                                status and tracking number
                                                there.
                                            </p>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </div>
                            </div>

                            {/* ── Right: Project Detail Card ── */}
                            <Card className="h-fit md:max-lg:col-span-2">
                                <CardContent className="space-y-6">
                                    <h3 className="text-muted-foreground border-b pb-3 text-2xl font-semibold">
                                        Project Detail
                                    </h3>

                                    {/* Quantity */}
                                    <div className="space-y-3">
                                        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                                            Quantity
                                        </span>
                                        {quantityRows.map((qty, rowIndex) => (
                                            <div
                                                key={rowIndex}
                                                className="flex items-center gap-3"
                                            >
                                                <NumberField
                                                    className="flex-1"
                                                    value={qty}
                                                    onChange={(val) =>
                                                        setQuantityRows((r) =>
                                                            r.map((q, i) =>
                                                                i === rowIndex
                                                                    ? val
                                                                    : q,
                                                            ),
                                                        )
                                                    }
                                                    minValue={1}
                                                    formatOptions={{
                                                        useGrouping: false,
                                                    }}
                                                >
                                                    <Group className="dark:bg-input/30 border-input data-focus-within:border-ring data-focus-within:ring-ring/50 relative inline-flex h-9 w-full min-w-0 items-center overflow-hidden rounded-lg border bg-transparent text-sm whitespace-nowrap shadow-xs outline-none data-focus-within:ring-[3px]">
                                                        <AriaButton
                                                            slot="decrement"
                                                            className="bg-primary/10 text-muted-foreground hover:bg-accent hover:text-foreground ms-2 flex aspect-square h-5.5 items-center justify-center rounded transition-colors disabled:pointer-events-none disabled:opacity-50"
                                                        >
                                                            <MinusIcon className="size-3" />
                                                            <span className="sr-only">
                                                                Decrement
                                                            </span>
                                                        </AriaButton>
                                                        <AriaInput className="selection:bg-primary selection:text-primary-foreground w-full grow px-2 py-2 text-center tabular-nums outline-none" />
                                                        <AriaButton
                                                            slot="increment"
                                                            className="bg-primary/10 text-muted-foreground hover:bg-accent hover:text-foreground me-2 flex aspect-square h-5.5 items-center justify-center rounded transition-colors disabled:pointer-events-none disabled:opacity-50"
                                                        >
                                                            <PlusIcon className="size-3" />
                                                            <span className="sr-only">
                                                                Increment
                                                            </span>
                                                        </AriaButton>
                                                    </Group>
                                                </NumberField>
                                                {quantityRows.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setQuantityRows(
                                                                (r) =>
                                                                    r.filter(
                                                                        (_, i) =>
                                                                            i !==
                                                                            rowIndex,
                                                                    ),
                                                            )
                                                        }
                                                        className="text-muted-foreground hover:text-destructive flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors"
                                                        aria-label="Remove"
                                                    >
                                                        <MinusIcon className="size-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {quantityRows.length < 3 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setQuantityRows((r) => [
                                                        ...r,
                                                        1,
                                                    ])
                                                }
                                                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm underline-offset-4 hover:underline"
                                            >
                                                <PlusIcon className="size-3.5" />
                                                Add quantity
                                            </button>
                                        )}
                                    </div>

                                    {/* Selected capabilities summary */}
                                    {selectedOptions.length > 0 && (
                                        <div className="space-y-3 border-t pt-4">
                                            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                                                Selected Capabilities
                                            </span>
                                            {selectedOptions.map(
                                                ({categoryTitle, option}) => (
                                                    <div
                                                        key={categoryTitle}
                                                        className="flex items-center gap-2.5"
                                                    >
                                                        {option.image && (
                                                            <img
                                                                src={option.image}
                                                                alt={option.label}
                                                                className="size-8 rounded object-cover"
                                                            />
                                                        )}
                                                        <div className="flex flex-col">
                                                            <span className="text-muted-foreground text-xs">
                                                                {categoryTitle}
                                                            </span>
                                                            <span className="text-sm font-medium">
                                                                {option.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}

                                    {/* Project description */}
                                    <div className="flex flex-col gap-2 border-t pt-4">
                                        <label
                                            className="text-muted-foreground text-xs font-medium uppercase tracking-wide"
                                            htmlFor="project-description"
                                        >
                                            Project Description
                                        </label>
                                        <textarea
                                            id="project-description"
                                            rows={4}
                                            placeholder="Tell us more about your project — materials, special requirements, artwork details, etc."
                                            className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring/50 w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-3 border-t pt-4">
                                        <Button size="lg" className="w-full">
                                            Get a Quote
                                        </Button>
                                        <button
                                            type="button"
                                            className="text-muted-foreground hover:text-foreground w-full text-center text-sm underline-offset-4 hover:underline"
                                        >
                                            Need another product?
                                        </button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default ProductOverview;
