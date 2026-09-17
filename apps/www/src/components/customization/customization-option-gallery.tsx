'use client';

import {useState} from 'react';
import {PackageIcon} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';
import {SanityImage} from '@/components/ui/sanity-image';
import type {CatalogMedia} from '@/lib/catalog/types';

type CustomizationOptionGalleryProps = {
    media: CatalogMedia[];
    title: string;
};

/**
 * Stacked gallery for a customization Option detail page (Category → Option).
 * Hero on top, equal thumb row below. Images fill frames (object-cover crop).
 * Not the PDP left-rail ProductGallery / MediaSettleZoom inset.
 */
export function CustomizationOptionGallery({
    media,
    title,
}: CustomizationOptionGalleryProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const items = media.length > 0 ? media : [{alt: title}];
    const active = items[activeIndex] ?? items[0];
    const showThumbs = items.length > 1;

    return (
        <div className="flex w-full flex-col gap-3 self-start lg:sticky lg:top-8">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted">
                {active?.src ? (
                    <SanityImage
                        src={active.src}
                        alt={active.alt}
                        fill
                        priority={activeIndex === 0}
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-cover"
                    />
                ) : (
                    <span className="absolute inset-0 flex items-center justify-center">
                        <PackageIcon
                            className="size-24 text-muted-foreground opacity-40"
                            aria-hidden
                        />
                    </span>
                )}
            </div>

            {showThumbs ? (
                <div
                    className="grid w-full gap-3"
                    style={{
                        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
                    }}
                >
                    {items.map((item, index) => {
                        const selected = index === activeIndex;
                        return (
                            <button
                                key={`${item.alt}-${index}`}
                                type="button"
                                aria-label={`Show image ${index + 1}`}
                                aria-pressed={selected}
                                onClick={() => setActiveIndex(index)}
                                className={cn(
                                    'relative aspect-square w-full overflow-hidden rounded-xl bg-muted outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring',
                                    selected
                                        ? 'ring-2 ring-foreground/20'
                                        : 'opacity-70 hover:opacity-100',
                                )}
                            >
                                {item.src ? (
                                    <SanityImage
                                        src={item.src}
                                        alt=""
                                        square
                                        fill
                                        sizes="160px"
                                        className="object-cover"
                                    />
                                ) : (
                                    <span className="flex h-full items-center justify-center">
                                        <PackageIcon
                                            className="size-5 text-muted-foreground opacity-40"
                                            aria-hidden
                                        />
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}
