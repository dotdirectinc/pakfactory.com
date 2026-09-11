'use client';

import Link from 'next/link';
import {Plus} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@pakfactory/ui/components/dropdown-menu';
import {cn} from '@pakfactory/ui/lib/utils';
import {REQUEST_COPY} from '@/lib/copy/request';
import {WWW_ROUTES} from '@/lib/www-routes';

type RequestAddProductsProps = {
    variant: 'empty' | 'more';
    /** Dropdown menu alignment. Default start (Your Request). */
    align?: 'start' | 'center';
    className?: string;
};

const ADD_PATHS = [
    {
        href: WWW_ROUTES.products,
        title: REQUEST_COPY.addProductsTitle,
        supporting: REQUEST_COPY.addProductsSupporting,
    },
    {
        href: WWW_ROUTES.solutions,
        title: REQUEST_COPY.addSolutionsTitle,
        supporting: REQUEST_COPY.addSolutionsSupporting,
    },
] as const;

/**
 * Add-product fork for Your Request and Brief Builder.
 * Products → /products; Solutions → /solutions.
 */
export function RequestAddProducts({
    variant,
    align = 'start',
    className,
}: RequestAddProductsProps) {
    if (variant === 'more') {
        return (
            <div className={cn('w-full', className)}>
                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-auto w-full justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-4 text-sm font-medium text-muted-foreground hover:bg-muted/30 has-[>svg]:px-4"
                        >
                            <Plus className="size-4" aria-hidden />
                            {REQUEST_COPY.addMoreProducts}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align={align}
                        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]"
                    >
                        {ADD_PATHS.map((path) => (
                            <DropdownMenuItem key={path.href} asChild>
                                <Link
                                    href={path.href}
                                    className="flex flex-col items-start gap-1 py-2"
                                >
                                    <span className="text-sm font-medium">
                                        {path.title}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {path.supporting}
                                    </span>
                                </Link>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        );
    }

    return (
        <div className={cn('flex flex-col gap-4', className)}>
            {ADD_PATHS.map((path) => (
                <Link
                    key={path.href}
                    href={path.href}
                    className="group flex flex-col gap-1"
                >
                    <span className="text-sm font-medium text-foreground group-hover:underline">
                        {path.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {path.supporting}
                    </span>
                </Link>
            ))}
        </div>
    );
}
