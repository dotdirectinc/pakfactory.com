'use client';

import Link from 'next/link';
import {Package} from 'lucide-react';
import {Button} from '@pakfactory/ui/components/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@pakfactory/ui/components/dialog';

import {BookmarkIconButton} from '@/components/ui/bookmark-icon-button';
import {Icon} from '@/components/ui/icon';
import {stubBookmarkAction} from '@/lib/catalog-card-actions';
import type {SolutionProductMock} from '@/lib/solutions/fixtures/mock-solution-products';

type SolutionProductPreviewProps = {
    product: SolutionProductMock | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

/**
 * Pre-customized solution product preview — image + customizations list.
 * Props-only; mock or future CMS payload via `product`.
 */
export function SolutionProductPreview({
    product,
    open,
    onOpenChange,
}: SolutionProductPreviewProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-h-[min(92vh,56rem)] w-[min(96vw,42rem)] max-w-none gap-0 overflow-y-auto p-0 sm:rounded-2xl md:min-w-[64rem]"
                aria-describedby={undefined}
            >
                {product ? (
                    <>
                        <DialogHeader className="border-b border-border px-6 py-4 pr-14 text-left">
                            <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                                {product.title}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="grid gap-6 p-6 lg:grid-cols-2 lg:items-start lg:gap-8">
                            <div className="flex min-w-0 flex-col gap-4">
                                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
                                    {product.image?.src ? (
                                        // eslint-disable-next-line @next/next/no-img-element -- mock/local until CMS
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

                            <div className="flex min-w-0 flex-col gap-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Customizations
                                </p>
                                <ul className="flex flex-col">
                                    {product.customizations.map((item) => (
                                        <li
                                            key={item.id}
                                            className="flex gap-4 border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0"
                                        >
                                            <span
                                                className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted"
                                                aria-hidden
                                            />
                                            <div className="flex min-w-0 flex-1 flex-col gap-2">
                                                <div className="flex flex-col gap-1">
                                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                        {item.category}
                                                    </p>
                                                    <h3 className="text-sm font-semibold tracking-tight text-foreground">
                                                        {item.title}
                                                    </h3>
                                                    <p className="text-sm leading-6 text-muted-foreground">
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
                            </div>
                        </div>
                    </>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
