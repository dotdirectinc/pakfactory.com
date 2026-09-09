'use client';

import Link from 'next/link';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';
import {Callout} from '@/components/common/callout';
import {REQUEST_COPY} from '@/lib/copy/request';
import {WWW_ROUTES} from '@/lib/www-routes';

type ExpressPoolBannerProps = {
    count: number;
    className?: string;
};

/**
 * Quiet prompt to continue a product pool on Your Request instead of
 * attaching it to the current express (requirements-only) brief.
 */
export function ExpressPoolBanner({count, className}: ExpressPoolBannerProps) {
    if (count <= 0) return null;

    const message =
        count === 1
            ? REQUEST_COPY.expressPoolBannerOne
            : REQUEST_COPY.expressPoolBannerMany.replace('{n}', String(count));

    return (
        <Callout
            className={cn(
                'flex flex-wrap items-center justify-between gap-3',
                className,
            )}
        >
            <p className="text-sm text-foreground">{message}</p>
            <Button
                type="button"
                variant="link"
                className="h-auto shrink-0 p-0 text-sm font-medium"
                asChild
            >
                <Link href={WWW_ROUTES.request}>
                    {REQUEST_COPY.expressPoolBannerCta}
                </Link>
            </Button>
        </Callout>
    );
}
