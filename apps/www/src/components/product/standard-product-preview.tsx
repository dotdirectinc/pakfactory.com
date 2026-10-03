'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ImageIcon, Package, Rotate3d} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';

import {ProductPreviewShell} from '@/components/ui/product-preview-shell';
import {Icon} from '@/components/ui/icon';
import {ModelViewer} from '@/components/ui/model-viewer';
import {SanityImage} from '@/components/ui/sanity-image';
import {isSanityCdnUrl} from '@/lib/sanity/image';

export type StandardProductPreviewSpec = {
    label: string;
    value: string;
};

export type StandardProductPreviewProduct = {
    id: string;
    title: string;
    detailHref: string;
    image?: {src: string; alt: string} | null;
    /** Optional GLB — adds a "View in 3D" toggle over the photo (PoC). */
    modelSrc?: string;
    /** Long description (Studio Description → pt::text). */
    description?: string;
    specs?: StandardProductPreviewSpec[];
};

/** Clip name inside the PoC GLB; drives the open/close control. */
const MODEL_ANIMATION_NAME = 'Box animation';

type StandardProductPreviewProps = {
    product: StandardProductPreviewProduct | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

/**
 * Standard product-line hero preview — unlabeled description + Specs list.
 * Composes {@link ProductPreviewShell}; does not serve inspiration/solution kinds.
 */
export function StandardProductPreview({
    product,
    open,
    onOpenChange,
}: StandardProductPreviewProps) {
    const [view, setView] = useState<'photo' | '3d'>('photo');
    const [modelFailed, setModelFailed] = useState(false);
    const [shownProductId, setShownProductId] = useState(product?.id);

    if (product?.id !== shownProductId) {
        setShownProductId(product?.id);
        setView('photo');
        setModelFailed(false);
    }

    const canShow3d = Boolean(product?.modelSrc) && !modelFailed;
    const show3d = canShow3d && view === '3d';
    const description = product?.description?.trim() || '';
    const specs = product?.specs ?? [];
    const imageSrc = product?.image?.src?.trim() || '';
    const imageAlt = product?.image?.alt || product?.title || '';

    return (
        <ProductPreviewShell
            open={open}
            onOpenChange={onOpenChange}
            title={product?.title ?? ''}
            media={
                product ? (
                    <>
                        {show3d && product.modelSrc ? (
                            <ModelViewer
                                src={product.modelSrc}
                                alt={`3D model of ${product.title}`}
                                poster={imageSrc || undefined}
                                animationName={MODEL_ANIMATION_NAME}
                                onError={() => setModelFailed(true)}
                            />
                        ) : imageSrc ? (
                            isSanityCdnUrl(imageSrc) ? (
                                <SanityImage
                                    src={imageSrc}
                                    alt={imageAlt}
                                    fill
                                    square
                                    sizes="(max-width: 768px) 90vw, 28rem"
                                    className="object-cover"
                                    priority
                                />
                            ) : (
                                // eslint-disable-next-line @next/next/no-img-element -- local placeholders
                                <img
                                    src={imageSrc}
                                    alt={imageAlt}
                                    className="size-full object-cover"
                                />
                            )
                        ) : (
                            <span className="flex size-full items-center justify-center">
                                <Icon
                                    icon={Package}
                                    className="size-12 text-muted-foreground/40"
                                />
                            </span>
                        )}
                        {canShow3d ? (
                            <button
                                type="button"
                                onClick={() =>
                                    setView(show3d ? 'photo' : '3d')
                                }
                                aria-pressed={show3d}
                                className="absolute top-3 right-3 z-10 flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background/90 px-4 py-2 text-sm font-medium text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                            >
                                {show3d ? 'View photo' : 'View in 3D'}
                                <Icon
                                    icon={show3d ? ImageIcon : Rotate3d}
                                    size="md"
                                />
                            </button>
                        ) : null}
                    </>
                ) : null
            }
            mediaFooter={
                product ? (
                    <Button
                        asChild
                        size="lg"
                        variant="default"
                        className="w-full"
                    >
                        <Link href={product.detailHref}>
                            View product details
                        </Link>
                    </Button>
                ) : null
            }
        >
            {product ? (
                <>
                    {description ? (
                        <p className="text-base leading-7 text-foreground">
                            {description}
                        </p>
                    ) : null}

                    {specs.length > 0 ? (
                        <section className="flex flex-col gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Specs
                            </p>
                            <ul className="flex list-none flex-col gap-2">
                                {specs.map((row) => (
                                    <li
                                        key={row.label}
                                        className="flex flex-col gap-1 sm:flex-row sm:gap-4"
                                    >
                                        <span className="shrink-0 text-sm font-medium text-foreground sm:w-36">
                                            {row.label}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            {row.value}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ) : null}
                </>
            ) : null}
        </ProductPreviewShell>
    );
}
