'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ImageIcon, Package, Rotate3d, X} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@pakfactory/ui/components/dialog';

import {BookmarkIconButton} from '@/components/ui/bookmark-icon-button';
import {Icon} from '@/components/ui/icon';
import {ModelViewer} from '@/components/ui/model-viewer';
import {stubBookmarkAction} from '@/lib/catalog-card-actions';
import type {
    SolutionHeroCustomization,
    SolutionMedia,
} from '@/lib/solutions/types';

export type SolutionHeroPreviewProduct = {
    id: string;
    title: string;
    detailHref: string;
    image?: SolutionMedia | null;
    /** Optional GLB — adds a "View in 3D" toggle over the photo (PoC, PROD-2777). */
    modelSrc?: string;
    customizations: SolutionHeroCustomization[];
};

/** Clip name inside the PoC GLB; drives the open/close control. */
const MODEL_ANIMATION_NAME = 'Box animation';

type SolutionProductPreviewProps = {
    product: SolutionHeroPreviewProduct | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

/**
 * Solution LP hero product preview — image + customizations list.
 * Props-only; CMS tiles supply the payload.
 */
export function SolutionProductPreview({
    product,
    open,
    onOpenChange,
}: SolutionProductPreviewProps) {
    const [view, setView] = useState<'photo' | '3d'>('photo');
    const [modelFailed, setModelFailed] = useState(false);
    const [shownProductId, setShownProductId] = useState(product?.id);

    // Each product opens on its photo; a failed model stays failed only for it.
    if (product?.id !== shownProductId) {
        setShownProductId(product?.id);
        setView('photo');
        setModelFailed(false);
    }

    const canShow3d = Boolean(product?.modelSrc) && !modelFailed;
    const show3d = canShow3d && view === '3d';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="flex max-h-[min(92vh,56rem)] w-[min(96vw,42rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl md:min-w-[64rem]"
                showCloseButton={false}
                aria-describedby={undefined}
            >
                {product ? (
                    <>
                        <DialogHeader className="relative shrink-0 border-b border-border px-6 py-4 pr-14 text-left">
                            <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                                {product.title}
                            </DialogTitle>
                            <button
                                type="button"
                                onClick={() => onOpenChange(false)}
                                className="absolute top-1/2 right-4 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden"
                            >
                                <Icon icon={X} size="sm" />
                                <span className="sr-only">Close</span>
                            </button>
                        </DialogHeader>

                        <div className="grid min-h-0 flex-1 gap-6 overflow-hidden p-6 lg:grid-cols-2 lg:gap-8">
                            <div className="flex min-w-0 shrink-0 flex-col gap-4">
                                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
                                    {show3d && product.modelSrc ? (
                                        <ModelViewer
                                            src={product.modelSrc}
                                            alt={`3D model of ${product.title}`}
                                            poster={product.image?.src}
                                            animationName={MODEL_ANIMATION_NAME}
                                            onError={() => setModelFailed(true)}
                                        />
                                    ) : product.image?.src ? (
                                        // eslint-disable-next-line @next/next/no-img-element -- CMS CDN URLs
                                        <img
                                            src={product.image.src}
                                            alt={product.image.alt}
                                            className="size-full object-cover"
                                        />
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
                                </div>
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
                            </div>

                            <div className="flex h-full min-h-0 min-w-0 flex-col gap-4">
                                <p className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Customizations
                                </p>
                                {product.customizations.length > 0 ? (
                                    <ul className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
                                        {product.customizations.map((item) => (
                                            <li
                                                key={item.id}
                                                className="flex gap-4 border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0"
                                            >
                                                <span
                                                    className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted"
                                                    aria-hidden
                                                >
                                                    {item.imageSrc ? (
                                                        // eslint-disable-next-line @next/next/no-img-element -- CMS CDN URLs
                                                        <img
                                                            src={item.imageSrc}
                                                            alt={
                                                                item.imageAlt ||
                                                                item.title
                                                            }
                                                            className="size-full object-cover"
                                                        />
                                                    ) : null}
                                                </span>
                                                <div className="flex min-w-0 flex-1 flex-col gap-2">
                                                    <div className="flex flex-col gap-1">
                                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                            {item.category}
                                                        </p>
                                                        <h3 className="text-sm font-semibold tracking-tight text-foreground">
                                                            {item.title}
                                                        </h3>
                                                        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                                                            {item.description}
                                                        </p>
                                                    </div>
                                                    <Link
                                                        href={item.learnMoreHref}
                                                        className="inline-block text-sm font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
                                                    >
                                                        Learn More
                                                    </Link>
                                                </div>
                                                <BookmarkIconButton
                                                    className="shrink-0"
                                                    ariaLabel={`Bookmark ${item.title}`}
                                                    onClick={stubBookmarkAction}
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Open the product page for customization
                                        details.
                                    </p>
                                )}
                            </div>
                        </div>
                    </>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
