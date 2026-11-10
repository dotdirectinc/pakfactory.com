'use client';

import {SanityImage} from '@/components/ui/sanity-image';
import {useSanityImageSettle} from '@/lib/sanity/use-sanity-image-settle';
import {cn} from '@pakfactory/ui/lib/utils';

const THUMB_SIZES = '64px';
const HERO_SIZES = '(max-width: 640px) 42vw, 216px';

type CompareSettlingImageProps = {
    src: string;
    alt?: string;
    /** Filled hero in the column head vs fixed square thumbs. */
    variant?: 'hero' | 'thumb';
    className?: string;
    /** Thumb box size classes when variant is thumb. Default size-8. */
    thumbClassName?: string;
    /** Above-the-fold heroes — eager load (Next `priority`). */
    priority?: boolean;
};

/**
 * Compare column / sticky / menu thumbs — same Sanity loader + settle as catalog cards.
 */
export function CompareSettlingImage({
    src,
    alt = '',
    variant = 'thumb',
    className,
    thumbClassName,
    priority = false,
}: CompareSettlingImageProps) {
    const {onLoad, onError, imageClassName} = useSanityImageSettle(src);

    if (variant === 'hero') {
        return (
            <span className={cn('relative block size-full overflow-hidden bg-muted', className)}>
                <SanityImage
                    src={src}
                    alt={alt}
                    applyWatermark={false}
                    fill
                    square
                    sizes={HERO_SIZES}
                    priority={priority}
                    className={cn('object-cover', imageClassName)}
                    onLoad={onLoad}
                    onError={onError}
                />
            </span>
        );
    }

    return (
        <span
            className={cn(
                'relative block size-8 shrink-0 overflow-hidden rounded-md bg-muted',
                thumbClassName,
                className,
            )}
        >
            <SanityImage
                src={src}
                alt={alt}
                applyWatermark={false}
                fill
                square
                sizes={THUMB_SIZES}
                priority={priority}
                className={cn('object-cover', imageClassName)}
                onLoad={onLoad}
                onError={onError}
            />
        </span>
    );
}
