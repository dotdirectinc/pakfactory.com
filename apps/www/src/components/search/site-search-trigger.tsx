'use client';

import {Search} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {Tooltip, TooltipContent, TooltipTrigger} from '@pakfactory/ui/components/tooltip';

import {useSiteSearchOpen} from './site-search-provider';

/** Header search icon (PROD-3111). Same treatment as SiteNav's request icon. */
export function SiteSearchTrigger() {
    const {setOpen} = useSiteSearchOpen();
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="relative size-9"
                    aria-label="Search"
                    aria-haspopup="dialog"
                    aria-keyshortcuts="Meta+K Control+K"
                    onClick={() => setOpen(true)}
                    data-site-search-trigger=""
                >
                    <Search className="size-6" strokeWidth={1.75} />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8} variant="pill">
                Search
            </TooltipContent>
        </Tooltip>
    );
}
