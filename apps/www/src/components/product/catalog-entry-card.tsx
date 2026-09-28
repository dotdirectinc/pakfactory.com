import Link from 'next/link';

import {cn} from '@pakfactory/ui/lib/utils';
import {PakFactoryMarkIcon} from '@pakfactory/ui/icons/pakfactory-mark-icon';

import {SanityImage} from '@/components/ui/sanity-image';
import {
    productMediaRestClass,
    productMediaSelfHoverClass,
} from '@/lib/ui/product-media-scale';

type CatalogEntryCardProps = {
    title: string;
    href: string;
    imageUrl?: string | null;
    imageAlt?: string | null;
    /** Uppercase label above the Explore headline. */
    eyebrow?: string;
    className?: string;
};

/**
 * Solid catalog entry tile — mobile: text left / image right; md+: text above
 * image. PakFactory mark on hover.
 */
export function CatalogEntryCard({
    title,
    href,
    imageUrl,
    imageAlt,
    eyebrow = 'Product line',
    className,
}: CatalogEntryCardProps) {
    const headline = `Explore ${title}`;

    return (
        <Link
            href={href}
            prefetch
            aria-label={headline}
            className={cn(
                'group relative flex h-full min-h-0 w-full flex-row items-stretch overflow-hidden rounded-2xl bg-muted outline-none md:flex-col',
                'ring-offset-background focus-visible:ring-2 focus-visible:ring-ring',
                productMediaRestClass,
                productMediaSelfHoverClass,
                className,
            )}
        >
            {/* Detail affordance: brand mark on hover/focus */}
            <div
                aria-hidden
                className={cn(
                    'pointer-events-none absolute z-30 hidden text-black/45 sm:block',
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

            <div
                className={cn(
                    'relative z-10 flex w-[42%] shrink-0 flex-col justify-center gap-2 px-4 py-4 sm:px-6 sm:py-6',
                    'md:w-auto md:justify-start md:pb-2 md:pt-6',
                )}
            >
                <div className="flex flex-col gap-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {eyebrow}
                    </span>
                    <h3 className="text-base font-semibold leading-snug tracking-tight text-foreground sm:text-lg">
                        {headline}
                    </h3>
                </div>
                <span className="inline-flex text-sm font-semibold text-foreground underline underline-offset-4">
                    Learn more
                </span>
            </div>

            <div className="relative min-h-0 min-w-0 flex-1">
                {imageUrl ? (
                    <div className="absolute bottom-0 -right-8 -top-2 left-0 md:inset-x-[-3.5rem] md:bottom-0 md:top-[0.5rem]">
                        <SanityImage
                            src={imageUrl}
                            alt={imageAlt ?? title}
                            fill
                            sizes="(max-width: 768px) 60vw, (max-width: 1280px) 30vw, 15vw"
                            className="object-contain object-right-bottom"
                        />
                    </div>
                ) : (
                    <div
                        className="absolute inset-0 bg-linear-to-t from-foreground/5 to-transparent"
                        aria-hidden
                    />
                )}
            </div>
        </Link>
    );
}
