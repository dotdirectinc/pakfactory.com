import {cn} from '@pakfactory/ui/lib/utils';

import type {TestimonialSource} from '@/lib/catalog/types';

type TestimonialSourceMarkProps = {
    source: TestimonialSource;
    /** Compact icon-only (footer aggregate) vs labeled “Posted on …” (card). */
    variant?: 'posted' | 'icon';
    className?: string;
};

function GoogleMark({className}: {className?: string}) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
        >
            <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
        </svg>
    );
}

function TrustpilotMark({className}: {className?: string}) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
        >
            <path
                fill="#00B67A"
                d="M12 1.5 14.9 9.1H23l-6.5 4.7 2.5 7.7L12 16.8 5 21.5l2.5-7.7L1 9.1h8.1L12 1.5Z"
            />
        </svg>
    );
}

const SOURCE_LABEL: Record<TestimonialSource, string> = {
    google: 'Google',
    trustpilot: 'Trustpilot',
};

const SOURCE_LABEL_CLASS: Record<TestimonialSource, string> = {
    google: 'text-[#4285F4]',
    trustpilot: 'text-[#00B67A]',
};

/**
 * Google / Trustpilot mark — props-only; no external links.
 */
export function TestimonialSourceMark({
    source,
    variant = 'posted',
    className,
}: TestimonialSourceMarkProps) {
    const Mark = source === 'google' ? GoogleMark : TrustpilotMark;

    if (variant === 'icon') {
        return <Mark className={cn('size-5 shrink-0', className)} />;
    }

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <Mark className="size-5 shrink-0" />
            <div className="flex flex-col gap-1 leading-none">
                <span className="text-xs text-muted-foreground">Posted on</span>
                <span
                    className={cn(
                        'text-sm font-medium',
                        SOURCE_LABEL_CLASS[source],
                    )}
                >
                    {SOURCE_LABEL[source]}
                </span>
            </div>
        </div>
    );
}
