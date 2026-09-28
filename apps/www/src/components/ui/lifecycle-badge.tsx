import Link from 'next/link';
import {Badge} from '@pakfactory/ui/components/badge';
import {cn} from '@pakfactory/ui/lib/utils';
import type {CatalogLifecycle} from '@/lib/catalog/types';

export const LIFECYCLE_COPY = {
    'coming-soon': {
        badge: 'Coming soon',
        title: 'Coming soon',
        body: 'This isn’t available to order yet. Talk to a specialist and we’ll let you know when it launches.',
    },
    discontinued: {
        badge: 'No longer available',
        title: 'No longer available',
        body: 'This has been discontinued. A specialist can recommend a current alternative.',
    },
} as const;

type LifecycleBadgeProps = {
    status?: CatalogLifecycle;
    className?: string;
};

/**
 * Props-only lifecycle badge for cards and page headers (PROD-2605). Renders nothing for an
 * active item — the baseline shows a status only when it is not the normal one.
 */
export function LifecycleBadge({status, className}: LifecycleBadgeProps) {
    if (!status || status === 'active') return null;
    return (
        <Badge variant="secondary" className={cn('uppercase tracking-wide', className)}>
            {LIFECYCLE_COPY[status].badge}
        </Badge>
    );
}

type LifecycleNoticeProps = {
    status?: CatalogLifecycle;
    /** Where "talk to a specialist" goes. */
    contactHref: string;
    className?: string;
};

/**
 * Takes the place of the add-to-request rail on a page whose product or customization cannot be
 * ordered — coming soon, or discontinued (PROD-2605).
 */
export function LifecycleNotice({status, contactHref, className}: LifecycleNoticeProps) {
    if (!status || status === 'active') return null;
    const copy = LIFECYCLE_COPY[status];
    return (
        <div
            role="status"
            className={cn('mt-6 rounded-lg border border-border bg-muted/40 p-5', className)}
        >
            <p className="text-sm font-semibold text-foreground">{copy.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
            <Link
                href={contactHref}
                className="mt-3 inline-block text-sm font-medium text-primary underline underline-offset-4"
            >
                Talk to a specialist
            </Link>
        </div>
    );
}
