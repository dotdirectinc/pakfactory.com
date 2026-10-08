'use client';

import {Copy} from 'lucide-react';

import {Button} from '@pakfactory/ui/components/button';

import {showToastCard} from '@/components/ui/toast-card';
import {Icon} from '@/components/ui/icon';
import {customizationCompatibilityHref} from '@/lib/www-routes';

type CompatibilityCopyLinkButtonProps = {
    engineQueryString: string;
    className?: string;
};

/** Copy the canonical compatibility engine URL (PROD-2921). */
export function CompatibilityCopyLinkButton({
    engineQueryString,
    className,
}: CompatibilityCopyLinkButtonProps) {
    const copyLink = async () => {
        const path = customizationCompatibilityHref(engineQueryString);
        const url =
            typeof window !== 'undefined'
                ? `${window.location.origin}${path}`
                : path;
        try {
            await navigator.clipboard.writeText(url);
            showToastCard({
                title: 'Link copied',
                description: 'Compatibility link is on your clipboard.',
                dismissLabel: 'Dismiss',
            });
        } catch {
            showToastCard({
                title: 'Could not copy link',
                description: 'Copy the URL from the address bar instead.',
                dismissLabel: 'Dismiss',
            });
        }
    };

    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyLink}
            className={className}
        >
            <Icon icon={Copy} size="sm" />
            Copy link
        </Button>
    );
}
