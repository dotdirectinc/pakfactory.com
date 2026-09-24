import type {MouseEvent} from 'react';
import Link from 'next/link';
import {ChevronRight, Package} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';
import {PakFactoryMarkIcon} from '@pakfactory/ui/icons/pakfactory-mark-icon';

import {Icon} from '@/components/ui/icon';
import {SanityImage} from '@/components/ui/sanity-image';
import {
    productMediaRestClass,
    productMediaSelfHoverClass,
} from '@/lib/ui/product-media-scale';

export type MediaTileCardProps = {
    href: string;
    title: string;
    description?: string;
    /** Eyebrow above the title (e.g. SKU). */
    eyebrow?: string;
    /** Meta alignment. Default `center` for catalog discovery tiles. */
    align?: 'center' | 'left';
    /**
     * Type density. `sm` for narrower tiles (e.g. 4-up carousel).
     * Independent of `align`.
     */
    size?: 'default' | 'sm';
    /** CTA label; pass `null` to hide. Default `See all`. */
    ctaLabel?: string | null;
    /**
     * When set, the whole card is a button that calls this handler
     * (e.g. open a quick-view dialog). CTA label is visual only.
     */
    onCtaClick?: (event: MouseEvent<HTMLButtonElement>) => void;
    imageSrc?: string | null;
    imageAlt?: string;
    className?: string;
    /**
     * Empty media well when `imageSrc` is missing.
     * `package` (default) — grey well + package icon (elevated keeps white well).
     * `mark` — white well + PakFactory mark (product-line styles grid).
     */
    emptyMedia?: 'package' | 'mark';
    /**
     * `elevated` — white chrome on a muted section band (no hover→muted washout;
     * empty media well stays white).
     * `muted` — muted chrome at rest (no hover washout).
     */
    surface?: 'default' | 'elevated' | 'muted';
};

/**
 * **General card** core — discovery / navigation tile.
 * Full-width media, then title / optional description / CTA.
 * Whole-card settle scale (`PRODUCT_MEDIA_SCALE`); brand mark on media hover.
 * Structure follows Figma ProjectCardOrbit; colors/spacing use PakFactory tokens.
 */
export function MediaTileCard({
    href,
    title,
    description,
    eyebrow,
    align = 'center',
    size = 'default',
    ctaLabel = 'See all',
    onCtaClick,
    imageSrc,
    imageAlt,
    className,
    emptyMedia = 'package',
    surface = 'default',
}: MediaTileCardProps) {
    const elevated = surface === 'elevated';
    const muted = surface === 'muted';
    const left = align === 'left';
    const compact = size === 'sm';
    const eyebrowText = eyebrow?.trim().toUpperCase();
    const interactive = onCtaClick != null;
    const markEmpty = emptyMedia === 'mark';

    const shellClassName = cn(
        'group flex h-full w-full flex-col overflow-hidden rounded-2xl outline-none',
        'ring-offset-background focus-visible:ring-2 focus-visible:ring-ring',
        muted
            ? 'bg-muted hover:bg-muted focus-within:bg-muted'
            : elevated
              ? 'bg-background hover:bg-background focus-within:bg-background'
              : 'bg-background hover:bg-muted focus-within:bg-muted',
        productMediaRestClass,
        productMediaSelfHoverClass,
        interactive && 'cursor-pointer text-left',
        className,
    );

    const emptyWellClass =
        markEmpty || elevated ? 'bg-background' : 'bg-muted';

    const media = (
        <div
            className={cn(
                'relative aspect-square w-full overflow-hidden',
                !imageSrc && emptyWellClass,
            )}
        >
            {imageSrc ? (
                <SanityImage
                    src={imageSrc}
                    alt={imageAlt ?? title}
                    square
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover"
                />
            ) : markEmpty ? (
                <span className="flex size-full items-center justify-center text-muted-foreground/40">
                    <PakFactoryMarkIcon size={40} className="-rotate-15" />
                </span>
            ) : (
                <span className="flex size-full items-center justify-center">
                    <Icon
                        icon={Package}
                        className="size-8 text-muted-foreground/50"
                    />
                </span>
            )}
            {/* Detail affordance: brand mark on hover/focus */}
            <div
                aria-hidden
                className={cn(
                    'pointer-events-none absolute z-30 hidden text-black/5 sm:block',
                    'sm:right-4 sm:top-4',
                    'sm:translate-x-[-5px] sm:translate-y-[5px] sm:opacity-0',
                    'sm:transition-[opacity,translate] sm:duration-[var(--motion-slow)] sm:ease-in-out',
                    'sm:group-hover:translate-x-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100',
                    'sm:group-focus-within:translate-x-0 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100',
                    'motion-reduce:sm:translate-x-0 motion-reduce:sm:translate-y-0 motion-reduce:sm:opacity-100 motion-reduce:sm:transition-none',
                )}
            >
                <PakFactoryMarkIcon size={28} className="-rotate-15" />
            </div>
        </div>
    );

    const ctaClassName = cn(
        'inline-flex items-center gap-1 font-semibold text-primary',
        compact ? 'text-sm' : 'text-base',
        left ? 'mt-4 justify-start' : 'justify-center',
    );

    const meta = (
        <div
            className={cn(
                'flex w-full flex-col gap-4 px-8 pb-8 pt-4',
                left ? 'items-start text-left' : 'items-center',
            )}
        >
            <div
                className={cn(
                    'flex w-full flex-col gap-1',
                    left ? 'items-start' : 'items-center',
                )}
            >
                {eyebrowText ? (
                    <span
                        className={cn(
                            'w-full truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
                            !left && 'text-center',
                        )}
                    >
                        {eyebrowText}
                    </span>
                ) : null}

                <p
                    className={cn(
                        'line-clamp-2 w-full font-medium leading-snug tracking-tight text-foreground',
                        compact ? 'text-base' : 'text-xl',
                        !left && 'text-center',
                        left &&
                            !description &&
                            ctaLabel == null &&
                            (compact ? 'min-h-10' : 'min-h-14'),
                    )}
                >
                    {title}
                </p>
            </div>

            {description ? (
                <p
                    className={cn(
                        'line-clamp-3 w-full leading-5 text-muted-foreground',
                        compact ? 'text-xs' : 'text-sm',
                        !left && 'text-center',
                    )}
                >
                    {description}
                </p>
            ) : null}

            {ctaLabel != null ? (
                <span className={ctaClassName}>
                    {ctaLabel}
                    <Icon icon={ChevronRight} size="sm" />
                </span>
            ) : null}
        </div>
    );

    if (interactive) {
        return (
            <button
                type="button"
                onClick={onCtaClick}
                className={cn(shellClassName, 'cursor-pointer')}
            >
                {media}
                {meta}
            </button>
        );
    }

    return (
        <Link href={href} className={shellClassName}>
            {media}
            {meta}
        </Link>
    );
}
