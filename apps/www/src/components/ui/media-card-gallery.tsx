'use client';

import {useState, type MouseEvent, type ReactNode} from 'react';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';
import {Icon} from '@/components/ui/icon';

export type MediaCardGalleryImage = {
    src: string;
    alt?: string;
};

type MediaCardGalleryProps = {
    images: MediaCardGalleryImage[];
    /** Renders the current slide (fill the parent absolute frame). */
    renderSlide: (image: MediaCardGalleryImage, index: number) => ReactNode;
    /** Optional link / hit-area behind controls. */
    link?: ReactNode;
    className?: string;
};

/**
 * Mini gallery for catalog cards (POC ProductCard pattern).
 * Prev/next mid-sides; scrubbing dots bottom-left. Chrome shows on parent `group` hover (sm+).
 */
export function MediaCardGallery({
    images,
    renderSlide,
    link,
    className,
}: MediaCardGalleryProps) {
    const [imgIndex, setImgIndex] = useState(0);
    const count = images.length;
    const safeIndex = Math.min(imgIndex, Math.max(count - 1, 0));
    const current = images[safeIndex];
    const hasGallery = count > 1;
    const atFirst = safeIndex <= 0;
    const atLast = safeIndex >= count - 1;

    function goToImage(next: number, event?: MouseEvent) {
        event?.preventDefault();
        event?.stopPropagation();
        if (count <= 1) return;
        setImgIndex(Math.max(0, Math.min(next, count - 1)));
    }

    if (!current) {
        return (
            <div className={cn('absolute inset-0', className)}>
                {link}
            </div>
        );
    }

    return (
        <div className={cn('absolute inset-0', className)}>
            {link}
            <div className="pointer-events-none absolute inset-0 z-0">
                {renderSlide(current, safeIndex)}
            </div>
            {hasGallery ? (
                <div
                    className={cn(
                        'pointer-events-none absolute inset-0 z-20 hidden transition-opacity duration-200 sm:block',
                        'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
                        'motion-reduce:opacity-100',
                    )}
                >
                    <button
                        type="button"
                        aria-label="Previous image"
                        disabled={atFirst}
                        onClick={(event) => goToImage(safeIndex - 1, event)}
                        className="pointer-events-auto absolute left-2 top-1/2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center text-foreground transition-opacity hover:opacity-80 disabled:pointer-events-none disabled:opacity-0"
                    >
                        <Icon icon={ChevronLeft} className="size-5" />
                    </button>
                    <button
                        type="button"
                        aria-label="Next image"
                        disabled={atLast}
                        onClick={(event) => goToImage(safeIndex + 1, event)}
                        className="pointer-events-auto absolute right-2 top-1/2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center text-foreground transition-opacity hover:opacity-80 disabled:pointer-events-none disabled:opacity-0"
                    >
                        <Icon icon={ChevronRight} className="size-5" />
                    </button>
                    <div className="pointer-events-auto absolute bottom-4 left-4 flex items-center gap-2">
                        {images.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                aria-label={`Show image ${i + 1} of ${count}`}
                                aria-current={i === safeIndex}
                                onClick={(event) => goToImage(i, event)}
                                className={cn(
                                    'h-1.5 cursor-pointer rounded-full transition-all duration-200',
                                    i === safeIndex
                                        ? 'w-5 bg-foreground shadow-sm'
                                        : 'w-1.5 bg-foreground/50 hover:bg-foreground/80',
                                )}
                            />
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
