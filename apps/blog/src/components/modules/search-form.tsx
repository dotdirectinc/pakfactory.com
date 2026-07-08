'use client';

import {Search} from 'lucide-react';
import type {RefObject} from 'react';
import {Input} from '@pakfactory/ui/components/input';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

type SearchFormProps = {
    defaultQuery?: string;
    className?: string;
};

/** Inline GET search — targets `/search` (PROD-1503). Reuse on 404 and zero-results. */
export function SearchForm({defaultQuery = '', className}: SearchFormProps) {
    return (
        <form action="/search" method="get" className={className}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label htmlFor="blog-search-q" className="sr-only">
                    Search the blog
                </label>
                <Input
                    id="blog-search-q"
                    name="q"
                    type="search"
                    placeholder="Search articles…"
                    defaultValue={defaultQuery}
                    className="min-w-0 flex-1"
                />
                <Button type="submit">Search</Button>
            </div>
        </form>
    );
}

type NavSearchFormProps = {
    id?: string;
    defaultQuery?: string;
    className?: string;
    fieldClassName?: string;
    inputRef?: RefObject<HTMLInputElement | null>;
    autoFocus?: boolean;
    placeholder?: string;
    showSubmit?: boolean;
    submitLabel?: string;
};

/** Pill GET search for site nav — targets `/search`. Reuse in desktop category row and compact overlay. */
export function NavSearchForm({
    id = 'site-nav-search',
    defaultQuery = '',
    className,
    fieldClassName,
    inputRef,
    autoFocus,
    placeholder = "What you'd like to read?",
    showSubmit = false,
    submitLabel = 'Search',
}: NavSearchFormProps) {
    const field = (
        <div className={cn('relative', showSubmit ? 'min-w-0 flex-1' : fieldClassName)}>
            <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={1.75}
                aria-hidden
            />
            <Input
                ref={inputRef}
                id={id}
                name="q"
                type="search"
                placeholder={placeholder}
                defaultValue={defaultQuery}
                autoFocus={autoFocus}
                className="h-10 rounded-full border-input bg-background pr-3 pl-9 shadow-none"
            />
        </div>
    );

    return (
        <form action="/search" method="get" className={className}>
            <label htmlFor={id} className="sr-only">
                {placeholder}
            </label>
            {showSubmit ? (
                <div className={cn('flex items-center gap-2', fieldClassName)}>
                    {field}
                    <Button
                        type="submit"
                        className="h-10 shrink-0 rounded-full bg-primary px-5 text-sm font-medium text-white hover:bg-primary/90"
                    >
                        {submitLabel}
                    </Button>
                </div>
            ) : (
                field
            )}
        </form>
    );
}
