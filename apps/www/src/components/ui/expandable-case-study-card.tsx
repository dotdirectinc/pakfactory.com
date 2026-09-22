'use client';

import {useEffect, useRef, useState, type TransitionEvent} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {ChevronRight} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';
import {formatSectionEyebrow} from '@/components/ui/section-heading';

const W_COLLAPSED = 456;
const W_EXPANDED = 840;

export type ExpandableCaseStudyTone = 'primary' | 'muted';

export type ExpandableCaseStudyCardData = {
    id: string;
    brand: string;
    tag: string;
    title: string;
    href: string;
    tone?: ExpandableCaseStudyTone;
    image?: {src: string; alt: string} | null;
};

const TONES: Record<
    ExpandableCaseStudyTone,
    {
        shell: string;
        light: boolean;
        brandText: string;
        tagText: string;
        titleText: string;
        inkMuted: string;
    }
> = {
    primary: {
        shell: 'bg-primary',
        light: false,
        brandText: 'text-primary-foreground',
        tagText: 'text-primary-foreground/70',
        titleText: 'text-primary-foreground',
        inkMuted: 'text-primary-foreground/80',
    },
    muted: {
        shell: 'bg-muted',
        light: true,
        brandText: 'text-foreground',
        tagText: 'text-muted-foreground',
        titleText: 'text-foreground',
        inkMuted: 'text-muted-foreground',
    },
};

type ExpandableCaseStudyCardProps = {
    card: ExpandableCaseStudyCardData;
    expanded: boolean;
    onFocus: () => void;
};

/**
 * Expand/collapse case-study card — collapsed solid tone, expanded image + gradient.
 * Bottom copy fades out for the shell morph (both directions), measure swaps while
 * invisible, then fades back in.
 */
export function ExpandableCaseStudyCard({
    card,
    expanded,
    onFocus,
}: ExpandableCaseStudyCardProps) {
    const [textWide, setTextWide] = useState(expanded);
    const [textOpaque, setTextOpaque] = useState(true);
    const wasExpandedRef = useRef(expanded);
    const tone = TONES[card.tone ?? 'primary'] ?? TONES.primary;
    const onLight = tone.light && !expanded;

    const brandText = onLight ? tone.brandText : 'text-white';
    const tagText = onLight ? tone.tagText : 'text-white/70';
    const titleText = onLight ? tone.titleText : 'text-white';
    const readMoreText = onLight ? tone.inkMuted : 'text-white/80';

    useEffect(() => {
        // Collapse — fade copy out; hold wide measure until width transitionend.
        if (!expanded) {
            if (wasExpandedRef.current) {
                setTextOpaque(false);
                wasExpandedRef.current = false;
                return;
            }
            setTextWide(false);
            setTextOpaque(true);
            wasExpandedRef.current = false;
            return;
        }

        // Expanding from collapsed — fade copy out; hold narrow measure until width ends.
        if (!wasExpandedRef.current) {
            setTextOpaque(false);
            setTextWide(false);
            wasExpandedRef.current = true;
            return;
        }

        // Already expanded (e.g. odd-index at rest) — wide + opaque immediately.
        setTextWide(true);
        setTextOpaque(true);
        wasExpandedRef.current = true;
    }, [expanded]);

    const handleTransitionEnd = (event: TransitionEvent<HTMLAnchorElement>) => {
        if (event.propertyName !== 'width') return;
        if (event.target !== event.currentTarget) return;

        setTextWide(expanded);
        requestAnimationFrame(() => setTextOpaque(true));
    };

    return (
        <Link
            href={card.href}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onMouseEnter={onFocus}
            onFocus={onFocus}
            onTransitionEnd={handleTransitionEnd}
            aria-current={expanded ? 'true' : undefined}
            style={{width: expanded ? W_EXPANDED : W_COLLAPSED}}
            className={cn(
                'group relative flex h-[560px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[14px] p-6 no-underline',
                'transition-[width] duration-500 ease-out',
                tone.shell,
            )}
        >
            {card.image?.src ? (
                <Image
                    src={card.image.src}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 90vw, 840px"
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    aria-hidden
                    className={cn(
                        'object-cover transition-opacity duration-500 ease-out',
                        expanded ? 'opacity-100' : 'opacity-0',
                    )}
                />
            ) : null}

            <div
                aria-hidden
                className={cn(
                    'absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/25 transition-opacity duration-500 ease-out',
                    expanded ? 'opacity-100' : 'opacity-0',
                )}
            />

            <p
                className={cn(
                    'relative text-sm font-medium uppercase tracking-[0.08em]',
                    brandText,
                )}
            >
                {card.brand}
            </p>

            <div
                className={cn(
                    'relative flex flex-col gap-2 transition-opacity duration-150 ease-out',
                    textOpaque ? 'opacity-100' : 'opacity-0',
                    !textOpaque && 'pointer-events-none',
                )}
            >
                <p
                    className={cn(
                        'text-[11px] font-semibold uppercase tracking-[0.08em]',
                        tagText,
                    )}
                >
                    {formatSectionEyebrow(card.tag)}
                </p>

                <h3
                    className={cn(
                        'text-2xl font-semibold leading-snug tracking-tight',
                        titleText,
                        textWide ? 'max-w-[640px]' : 'max-w-[340px]',
                    )}
                >
                    {card.title}
                </h3>

                <span
                    className={cn(
                        'inline-flex items-center gap-2 text-sm font-medium',
                        readMoreText,
                    )}
                >
                    Read more
                    <Icon
                        icon={ChevronRight}
                        size="sm"
                        className="transition-transform duration-300 ease-out group-hover:translate-x-0.5"
                    />
                </span>
            </div>
        </Link>
    );
}
