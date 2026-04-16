// Source: shadcn-studio (category-filter-05)
'use client';

import {type ReactNode, useEffect, useState} from 'react';

import {
    ChevronDownIcon,
    CircleIcon,
    FilterIcon,
    SearchIcon,
} from 'lucide-react';
import {useMedia} from 'react-use';

import {Checkbox as CheckboxPrimitive} from 'radix-ui';

import {Button} from '@pakfactory/ui/components/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@pakfactory/ui/components/card';
import {Checkbox} from '@pakfactory/ui/components/checkbox';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@pakfactory/ui/components/collapsible';
import {Input} from '@pakfactory/ui/components/input';
import {Label} from '@pakfactory/ui/components/label';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@pakfactory/ui/components/sheet';
import {Slider} from '@pakfactory/ui/components/slider';

import {cn} from '@pakfactory/ui/lib/utils';

type CategoryFilterProps = {
    className?: string;
    children?: ReactNode;
};

const CategoryFilter = ({className, children}: CategoryFilterProps) => {
    const [open, setOpen] = useState(false);

    const isCompactScreen = useMedia('(max-width: 767px)', false);

    const [value, setValue] = useState([2000, 8000]);

    useEffect(() => {
        if (!isCompactScreen) {
            setOpen(false);
        }
    }, [isCompactScreen]);

    const filterContent = (
        <div className="space-y-4 text-sm leading-snug text-foreground">
            {/* Product type */}
            <Collapsible
                defaultOpen
                className="flex w-full flex-col border-b px-3 pb-4"
            >
                <div className="flex items-center justify-between gap-6">
                    <div className="text-sm font-semibold tracking-tight mb-2">
                        Product Type
                    </div>
                    <CollapsibleTrigger>
                        <ChevronDownIcon className="size-4 shrink-0 transition-transform duration-300 [[data-state=open]>&]:rotate-180" />
                    </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down space-y-4 overflow-hidden pt-2 transition-all duration-300">
                    <div className="flex items-center gap-2 px-1">
                        <Checkbox
                            id="jeans"
                            defaultChecked
                            className="size-4 [&_svg]:size-3.5"
                        />
                        <Label htmlFor="jeans">Standard</Label>
                    </div>
                    <div className="flex items-center gap-2 px-1">
                        <Checkbox
                            id="jerseyTops"
                            className="size-4 [&_svg]:size-3.5"
                        />
                        <Label htmlFor="jerseyTops">Industry</Label>
                    </div>
                </CollapsibleContent>
            </Collapsible>

            {/* Product Line */}
            <Collapsible
                defaultOpen
                className="flex w-full flex-col border-b px-3 pb-4"
            >
                <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold tracking-tight  mb-2">
                        Product Line
                    </div>
                    <CollapsibleTrigger>
                        <ChevronDownIcon className="size-4 shrink-0 transition-transform duration-300 [[data-state=open]>&]:rotate-180" />
                    </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down space-y-4 overflow-hidden pt-2 transition-all duration-300">
                    <div className="flex items-center gap-2 px-1">
                        <Checkbox
                            id="customBoxes"
                            defaultChecked
                            className="size-4 [&_svg]:size-3.5"
                        />
                        <Label htmlFor="customBoxes">Rigid Boxes</Label>
                    </div>
                    <div className="flex items-center gap-2 px-1">
                        <Checkbox
                            id="mailerBoxes"
                            className="size-4 [&_svg]:size-3.5"
                        />
                        <Label htmlFor="mailerBoxes">Folding Cartons</Label>
                    </div>
                    <div className="flex items-center gap-2 px-1">
                        <Checkbox
                            id="rigidBoxes"
                            className="size-4 [&_svg]:size-3.5"
                        />
                        <Label htmlFor="rigidBoxes">Corrugated Boxes</Label>
                    </div>
                    <div className="flex items-center gap-2 px-1">
                        <Checkbox
                            id="foldingCartons"
                            className="size-4 [&_svg]:size-3.5"
                        />
                        <Label htmlFor="foldingCartons">Folding Cartons</Label>
                    </div>
                    <div className="flex items-center gap-2 px-1">
                        <Checkbox
                            id="polyBags"
                            className="size-4 [&_svg]:size-3.5"
                        />
                        <Label htmlFor="polyBags">Poly Bags</Label>
                    </div>
                    <div className="flex items-center gap-2 px-1">
                        <Checkbox
                            id="tissueWrapping"
                            className="size-4 [&_svg]:size-3.5"
                        />
                        <Label htmlFor="tissueWrapping">Tissue Wrapping</Label>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );

    return (
        <section className="py-8 sm:py-16 lg:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Mobile Filter Trigger */}
                <div className="mb-4 md:hidden">
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" className="w-full">
                                <FilterIcon className="mr-2" />
                                Filter
                            </Button>
                        </SheetTrigger>
                        <SheetContent
                            side="left"
                            className="w-[300px] gap-0 overflow-y-auto sm:w-[400px]"
                        >
                            {/* <SheetHeader className="gap-2 pb-0">
                                <div className="w-full">
                                    <Label htmlFor="search" className="sr-only">
                                        Search
                                    </Label>
                                    <div className="relative">
                                        <div className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-2.5 peer-disabled:opacity-50">
                                            <SearchIcon className="size-3.5" />
                                            <span className="sr-only">
                                                Search
                                            </span>
                                        </div>
                                        <Input
                                            id="search"
                                            type="text"
                                            placeholder="Search here..."
                                            className="peer h-9 pl-8 text-sm"
                                        />
                                    </div>
                                </div>
                            </SheetHeader> */}
                            <div className="mt-4 mb-4 space-y-4">
                                {filterContent}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                    <Card
                        className={cn(
                            'hidden gap-4 rounded-lg py-3 shadow-none md:col-span-1 md:inline-flex',
                            className,
                        )}
                    >
                        <CardHeader className="gap-2 px-3">
                            <div className="w-full">
                                <Label htmlFor="search" className="sr-only">
                                    Search
                                </Label>
                                <div className="relative">
                                    <div className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-2.5 peer-disabled:opacity-50">
                                        <SearchIcon className="size-3.5" />
                                        <span className="sr-only">Search</span>
                                    </div>
                                    <Input
                                        id="search"
                                        type="text"
                                        placeholder="Search here..."
                                        className="peer h-9 pl-8 text-sm"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 px-0">
                            {filterContent}
                        </CardContent>
                    </Card>
                    <div className="col-span-1 md:col-span-4">
                        {children ?? (
                            <div className="min-h-100 rounded-xl border border-dashed border-border" />
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CategoryFilter;
