'use client';

import {useState, type SVGProps} from 'react';
import {Check, Facebook, Link, Linkedin} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {cn} from '@pakfactory/ui/lib/utils';
import {EXTERNAL_LINK_REL} from '@pakfactory/utilities/external-link';

import {Icon} from '@/components/ui/icon';

// House set (PROD-2016, same as the site footer, blog and case studies):
// lucide for LinkedIn / Facebook; X keeps its official brand mark.
function XBrandIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
}

type ShareButtonsProps = {
    /** Absolute URL to share. */
    url: string;
    title: string;
    className?: string;
};

/** Outline icon Button, round, lifting and tinting on hover (blog `PostShareButtons`). */
const ICON_BUTTON =
    'rounded-full text-muted-foreground hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10 hover:text-primary motion-reduce:transition-none motion-reduce:hover:translate-y-0';

/**
 * LinkedIn · X · Facebook · Copy link. Ported from the blog's
 * `PostShareButtons` (separate app); props-only (ADR-013).
 */
export function ShareButtons({url, title, className}: ShareButtonsProps) {
    const [copied, setCopied] = useState(false);
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);

    const networks = [
        {
            id: 'linkedin',
            label: 'Share on LinkedIn',
            href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
            icon: <Icon icon={Linkedin} />,
        },
        {
            id: 'x',
            label: 'Share on X',
            href: `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
            icon: <XBrandIcon className="size-4" />,
        },
        {
            id: 'facebook',
            label: 'Share on Facebook',
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            icon: <Icon icon={Facebook} />,
        },
    ];

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard unavailable (non-secure context) — nothing to do.
        }
    }

    return (
        <div className={cn('flex items-center gap-2', className)}>
            {networks.map((network) => (
                <Button
                    key={network.id}
                    asChild
                    variant="outline"
                    size="icon"
                    className={ICON_BUTTON}
                >
                    <a
                        href={network.href}
                        target="_blank"
                        rel={EXTERNAL_LINK_REL}
                        aria-label={network.label}
                    >
                        {network.icon}
                    </a>
                </Button>
            ))}
            <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyLink}
                aria-label={copied ? 'Link copied' : 'Copy link'}
                className={ICON_BUTTON}
            >
                <Icon icon={copied ? Check : Link} />
            </Button>
            <span role="status" className="sr-only">
                {copied ? 'Link copied to clipboard.' : ''}
            </span>
        </div>
    );
}
