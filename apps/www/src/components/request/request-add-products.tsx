'use client';

import Link from 'next/link';
import {ChevronDown} from 'lucide-react';
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
    className,
}: RequestAddProductsProps) {
    if (variant === 'more') {
        return (
            <div className={cn('flex justify-start', className)}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="link"
                            className="h-auto justify-start gap-1 p-0 text-sm font-medium has-[>svg]:px-0"
                        >
                            {REQUEST_COPY.addMoreProducts}
                            <ChevronDown className="size-4 opacity-70" aria-hidden />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-56">
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
