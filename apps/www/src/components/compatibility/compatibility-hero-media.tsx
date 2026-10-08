import {ImagePlaceholder} from '@pakfactory/ui/components/image-placeholder';
import {cn} from '@pakfactory/ui/lib/utils';

import {SanityImage} from '@/components/ui/sanity-image';
import type {CompatibilityHeroMediaItem} from '@/lib/catalog/build-compatibility-page';

type CompatibilityHeroMediaProps = {
    items: CompatibilityHeroMediaItem[];
    className?: string;
};

function cellClass(span?: string) {
    return cn(
        'relative size-full min-h-0 min-w-0 overflow-hidden bg-muted',
        span,
    );
}

function HeroCell({
    item,
    className,
    priority,
}: {
    item: CompatibilityHeroMediaItem;
    className?: string;
    priority?: boolean;
}) {
    const src = item.src?.trim() || '';
    return (
        <div className={cellClass(className)}>
            {src ? (
                <SanityImage
                    src={src}
                    alt={item.alt}
                    fill
                    square
                    priority={priority}
                    sizes="(max-width: 1024px) 50vw, 22vw"
                    className="object-cover"
                />
            ) : (
                <ImagePlaceholder
                    className="absolute inset-0"
                    iconClassName="size-10 lg:size-12"
                />
            )}
        </div>
    );
}

function cellKey(item: CompatibilityHeroMediaItem, index: number) {
    return `${item.src ?? 'placeholder'}-${item.alt}-${index}`;
}

/**
 * Square collage of selected customization primary stills (PROD-2921).
 * Even counts use a regular grid; odd counts use bento spans to fill the square.
 * Missing images render as placeholders so slot count matches selections.
 */
export function CompatibilityHeroMedia({
    items,
    className,
}: CompatibilityHeroMediaProps) {
    const count = items.length;

    if (count === 0) {
        return (
            <div className={cn('relative aspect-square size-full', className)}>
                <ImagePlaceholder
                    className="absolute inset-0"
                    iconClassName="size-16 lg:size-20"
                />
            </div>
        );
    }

    if (count === 1) {
        return (
            <div className={cn('relative aspect-square size-full', className)}>
                <HeroCell item={items[0]!} priority />
            </div>
        );
    }

    if (count === 2) {
        return (
            <div
                className={cn(
                    'grid aspect-square size-full grid-cols-2 gap-1',
                    className,
                )}
            >
                <HeroCell item={items[0]!} priority />
                <HeroCell item={items[1]!} />
            </div>
        );
    }

    if (count === 3) {
        return (
            <div
                className={cn(
                    'grid aspect-square size-full grid-cols-2 grid-rows-2 gap-1',
                    className,
                )}
            >
                <HeroCell item={items[0]!} priority className="row-span-2" />
                <HeroCell item={items[1]!} />
                <HeroCell item={items[2]!} />
            </div>
        );
    }

    if (count === 4) {
        return (
            <div
                className={cn(
                    'grid aspect-square size-full grid-cols-2 grid-rows-2 gap-1',
                    className,
                )}
            >
                {items.map((item, index) => (
                    <HeroCell
                        key={cellKey(item, index)}
                        item={item}
                        priority={index === 0}
                    />
                ))}
            </div>
        );
    }

    if (count === 5) {
        return (
            <div
                className={cn(
                    'grid aspect-square size-full grid-cols-6 grid-rows-2 gap-1',
                    className,
                )}
            >
                <HeroCell
                    item={items[0]!}
                    priority
                    className="col-span-2"
                />
                <HeroCell item={items[1]!} className="col-span-2" />
                <HeroCell item={items[2]!} className="col-span-2" />
                <HeroCell item={items[3]!} className="col-span-3" />
                <HeroCell item={items[4]!} className="col-span-3" />
            </div>
        );
    }

    // 6+: 3-column rows; last incomplete row spans to fill the square.
    const remainder = count % 3;
    return (
        <div
            className={cn(
                'grid aspect-square size-full grid-cols-3 gap-1',
                className,
            )}
        >
            {items.map((item, index) => {
                const isLast = index === count - 1;
                const isSecondLast = index === count - 2;
                const classNameForCell =
                    remainder === 1 && isLast
                        ? 'col-span-3'
                        : remainder === 2 && isSecondLast
                          ? 'col-span-1'
                          : remainder === 2 && isLast
                            ? 'col-span-2'
                            : undefined;
                return (
                    <HeroCell
                        key={cellKey(item, index)}
                        item={item}
                        priority={index === 0}
                        className={classNameForCell}
                    />
                );
            })}
        </div>
    );
}
