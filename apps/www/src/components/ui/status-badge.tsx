import Link from 'next/link';
import {Badge} from '@pakfactory/ui/components/badge';
import {cn} from '@pakfactory/ui/lib/utils';
import {NotifyMeCapture} from '@/components/ui/notify-me-capture';
import type {CatalogLifecycle} from '@/lib/catalog/types';

export const STATUS_COPY = {
    'coming-soon': {
        badge: 'Coming soon',
        title: 'Coming soon',
        body: 'Be the first to be notified when this launches.',
    },
    discontinued: {
        badge: 'No longer available',
        title: 'No longer available',
        body: 'This has been discontinued. A specialist can recommend a current alternative.',
    },
} as const;

type StatusBadgeProps = {
    status?: CatalogLifecycle;
    className?: string;
};

/**
 * Props-only status badge for cards and page headers (PROD-2605). Renders nothing for an
 * active item — the baseline shows a status only when it is not the normal one.
 */
export function StatusBadge({status, className}: StatusBadgeProps) {
    if (!status || status === 'active') return null;
    return (
        <Badge
            variant="secondary"
            className={cn(
                'border-transparent bg-muted-foreground px-2 py-0 text-[10px] font-medium leading-4 text-background uppercase tracking-wide',
                className,
            )}
        >
            {STATUS_COPY[status].badge}
        </Badge>
    );
}

type StatusNoticeProps = {
    status?: CatalogLifecycle;
    /** Where "talk to a specialist" goes. */
    contactHref: string;
    className?: string;
};

/**
 * Takes the place of order CTAs when a product or customization cannot be ordered
 * (PROD-2605). Coming soon uses {@link NotifyMeCapture}; discontinued is specialist-only.
 */
export function StatusNotice({status, contactHref, className}: StatusNoticeProps) {
    if (!status || status === 'active') return null;

    if (status === 'coming-soon') {
        const copy = STATUS_COPY['coming-soon'];
        return (
            <NotifyMeCapture
                title={copy.title}
                description={copy.body}
                specialistHref={contactHref}
                className={cn('mt-6', className)}
            />
        );
    }

    const copy = STATUS_COPY.discontinued;
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
