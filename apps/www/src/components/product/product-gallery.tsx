'use client';

import {useState} from 'react';
import {PackageIcon} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';
import type {CatalogMedia} from '@/lib/catalog/types';

type ProductGalleryProps = {
    media: CatalogMedia[];
    productTitle: string;
};

export function ProductGallery({media, productTitle}: ProductGalleryProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const items = media.length > 0 ? media : [{alt: productTitle}];
    const active = items[activeIndex] ?? items[0];
    const showRail = items.length > 1;

    return (
        <div className="flex items-start gap-5 self-start lg:sticky lg:top-8">
            {showRail ? (
                <div className="relative w-16 shrink-0">
                    <div className="flex flex-col gap-2">
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
                                        'aspect-square w-full shrink-0 cursor-pointer overflow-hidden rounded-sm bg-background outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring',
                                        selected
                                            ? 'shadow-md'
                                            : 'border border-border opacity-60 hover:opacity-100',
                                    )}
                                >
                                    {item.src ? (
                                        <img
                                            src={item.src}
                                            alt=""
                                            className="h-full w-full object-cover"
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
                </div>
            ) : null}
            <div className="relative aspect-square min-w-0 flex-1 overflow-hidden rounded-2xl bg-brand-offwhite">
                {active?.src ? (
                    <img
                        src={active.src}
                        alt={active.alt}
                        className="absolute inset-0 size-full object-cover"
                    />
                ) : (
                    <span className="absolute inset-0 flex items-center justify-center">
                        <PackageIcon
                            className="size-32 text-muted-foreground opacity-40"
                            aria-hidden
                        />
                    </span>
                )}
            </div>
        </div>
    );
}
