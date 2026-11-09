'use client';

import {useState} from 'react';
import {Check, Share2} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';

import {showToastCard} from '@/components/ui/toast-card';

type CompareShareLinkProps = {
    className?: string;
};

/**
 * Copy the current compare URL so others open the same selection.
 */
export function CompareShareLink({className}: CompareShareLinkProps) {
    const [copied, setCopied] = useState(false);

    async function handleShare() {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            showToastCard({
                title: 'Link copied',
                description: 'Share this URL to open the same comparison.',
                dismissLabel: 'Dismiss',
            });
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
            showToastCard({
                title: 'Could not copy link',
                description: 'Copy the URL from the address bar instead.',
                dismissLabel: 'Dismiss',
            });
        }
    }

    return (
        <div className={cn('flex w-full flex-col gap-2', className)}>
            <Button
                type="button"
                variant="secondary"
                className="h-10 w-full gap-2 px-6 py-2.5 text-sm font-medium shadow-none"
                onClick={handleShare}
            >
                {copied ? (
                    <>
                        <Check className="size-4 shrink-0" aria-hidden />
                        Link copied
                    </>
                ) : (
                    <>
                        <Share2 className="size-4 shrink-0" aria-hidden />
                        Share
                    </>
                )}
            </Button>
            <p className="text-xs leading-relaxed text-muted-foreground">
                Share this URL so others open the same comparison.
            </p>
        </div>
    );
}
