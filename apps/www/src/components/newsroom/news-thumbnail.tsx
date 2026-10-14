import {ImageIcon} from 'lucide-react';
import {cn} from '@pakfactory/ui/lib/utils';

import {Icon} from '@/components/ui/icon';
import {SanityImage} from '@/components/ui/sanity-image';
import type {NewsImage} from '@/lib/newsroom/types';

type NewsThumbnailProps = {
    image: NewsImage | null;
    /** Tailwind aspect class, e.g. `aspect-[4/3]` or `aspect-video`. */
    aspectClassName: string;
    sizes: string;
    className?: string;
};

/**
 * Release thumbnail. Keeps the Studio hotspot inside the crop via
 * `object-position`; no image → the muted placeholder well.
 */
export function NewsThumbnail({
    image,
    aspectClassName,
    sizes,
    className,
}: NewsThumbnailProps) {
    return (
        <div
            className={cn(
                'relative w-full shrink-0 overflow-hidden rounded-xl bg-muted',
                aspectClassName,
                className,
            )}
        >
            {image ? (
                <SanityImage
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes={sizes}
                    className="object-cover"
                    style={
                        image.objectPosition
                            ? {objectPosition: image.objectPosition}
                            : undefined
                    }
                />
            ) : (
                <span className="flex size-full items-center justify-center">
                    <Icon
                        icon={ImageIcon}
                        size="lg"
                        className="text-muted-foreground/50"
                    />
                </span>
            )}
        </div>
    );
}
