import {cn} from '@pakfactory/ui/lib/utils';
import {formatSectionEyebrow} from '@/components/ui/section-heading';
import {SanityImage} from '@/components/ui/sanity-image';

export type ShowcaseGalleryImage = {
    src?: string;
    alt: string;
};

type ShowcaseImageTileProps = {
    image?: ShowcaseGalleryImage | null;
    className?: string;
};

function ShowcaseImageTile({image, className}: ShowcaseImageTileProps) {
    const src = image?.src?.trim();
    const alt = image?.alt?.trim() || '';

    return (
        <div
            className={cn(
                'relative min-h-50 overflow-hidden rounded-2xl bg-muted ring-1 ring-border/40',
                className,
            )}
        >
            {src ? (
                <SanityImage
                    src={src}
                    alt={alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover"
                />
            ) : null}
        </div>
    );
}

function padImages(
    images: ShowcaseGalleryImage[] | undefined,
): (ShowcaseGalleryImage | undefined)[] {
    const next = (images ?? []).slice(0, 6);
    while (next.length < 6) {
        next.push({alt: `Showcase placeholder ${next.length + 1}`});
    }
    return next;
}

type CustomizationShowcaseGalleryProps = {
    kicker: string;
    title: string;
    subtitle: string;
    images?: ShowcaseGalleryImage[];
    className?: string;
};

/**
 * Bento showcase gallery — POC MaterialShowcaseGallery layout.
 * Image order: [leftTall, midTop, midBottom, rightTop, rightMid, rightBottom].
 */
export function CustomizationShowcaseGallery({
    kicker,
    title,
    subtitle,
    images,
    className,
}: CustomizationShowcaseGalleryProps) {
    const [leftTall, midTop, midBottom, rightTop, rightMid, rightBottom] =
        padImages(images);

    return (
        <div
            className={cn(
                'flex flex-col gap-8 lg:min-h-[min(72vh,640px)] lg:flex-row lg:items-stretch lg:gap-6',
                className,
            )}
        >
            <div className="flex min-w-0 flex-1 flex-col gap-6 lg:max-w-none">
                <header className="flex flex-col gap-4">
                    <p className="text-[11px] font-semibold tracking-[0.08em] text-brand-blue uppercase">
                        {formatSectionEyebrow(kicker)}
                    </p>
                    <h2 className="text-base font-semibold text-foreground sm:text-lg md:text-[32px] md:leading-tight md:tracking-[-0.02em]">
                        {title}
                    </h2>
                    <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
                        {subtitle}
                    </p>
                </header>
                <ShowcaseImageTile
                    image={leftTall}
                    className="min-h-70 flex-1 lg:min-h-0"
                />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-6">
                <ShowcaseImageTile
                    image={midTop}
                    className="min-h-55 flex-1 lg:min-h-0"
                />
                <ShowcaseImageTile
                    image={midBottom}
                    className="min-h-55 flex-1 lg:min-h-0"
                />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-6">
                <ShowcaseImageTile
                    image={rightTop}
                    className="min-h-40 flex-1 lg:min-h-0"
                />
                <ShowcaseImageTile
                    image={rightMid}
                    className="min-h-40 flex-1 lg:min-h-0"
                />
                <ShowcaseImageTile
                    image={rightBottom}
                    className="min-h-40 flex-1 lg:min-h-0"
                />
            </div>
        </div>
    );
}
