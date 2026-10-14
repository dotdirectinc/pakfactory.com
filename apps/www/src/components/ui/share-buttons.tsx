'use client';

import {useState, type SVGProps} from 'react';
import {Check, Facebook, Link2, Linkedin} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';
import {EXTERNAL_LINK_REL} from '@pakfactory/utilities/external-link';

import {Icon} from '@/components/ui/icon';

// X keeps its brand mark; LinkedIn / Facebook use lucide, as on case studies.
function XMark(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
        </svg>
    );
}

type ShareButtonsProps = {
    /** Absolute URL to share. */
    url: string;
    title: string;
    className?: string;
};

/** Round icon button — lifts and tints on hover (blog `PostShareButtons`). */
const ICON_BUTTON =
    'flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10 hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0';

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
            icon: <XMark className="size-4" />,
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
                <a
                    key={network.id}
                    href={network.href}
                    target="_blank"
                    rel={EXTERNAL_LINK_REL}
                    aria-label={network.label}
                    className={ICON_BUTTON}
                >
                    {network.icon}
                </a>
            ))}
            <button
                type="button"
                onClick={copyLink}
                aria-label={copied ? 'Link copied' : 'Copy link'}
                className={cn(ICON_BUTTON, 'cursor-pointer')}
            >
                <Icon icon={copied ? Check : Link2} />
            </button>
            <span role="status" className="sr-only">
                {copied ? 'Link copied to clipboard.' : ''}
            </span>
        </div>
    );
}
